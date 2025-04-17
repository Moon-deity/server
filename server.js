import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import { DataSource } from './lib/models.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const defaultDataSources = [];
const dataSources = new Map();

const loadDataSources = async () => {
    try {
        const dbSources = await DataSource.find({});
        dbSources.forEach(source => {
            dataSources.set(source.id, {
                id: source.id,
                url: source.url,
                name: source.name,
                theme: source.theme
            });
        });
        console.log(`Loaded ${dbSources.length} data sources from MongoDB`);
    } catch (error) {
        console.error('Error loading data sources from MongoDB:', error);
    }
};

const fetchDataFromSource = async (source) => {
    try {
        console.log(`Fetching data from ${source.url}`);
        const response = await fetch(source.url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error fetching from ${source.id} (${source.url}):`, error);
        return { error: `Failed to fetch data from ${source.name}` };
    }
};

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/astrikos', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000
});

const db = mongoose.connection;
db.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

db.once('open', async () => {
    console.log('MongoDB connected successfully');
    await loadDataSources();
});

io.on('connection', (socket) => {
    console.log(`Connected: ${socket.id}`);
    socket.emit('available-sources', Array.from(dataSources.values()));
    const activeIntervals = new Map();

    socket.on('subscribe-source', async ({ sourceId }) => {
        if (activeIntervals.has(sourceId)) {
            console.log(`Client already subscribed to source: ${sourceId}`);
            return;
        }

        const source = dataSources.get(sourceId);
        if (!source) {
            socket.emit('error', { message: `Source with ID ${sourceId} not found` });
            return;
        }

        console.log(`Client subscribed to source: ${sourceId}`);

        const interval = setInterval(async () => {
            try {
                const data = await fetchDataFromSource(source);

                socket.emit('realtime-data', {
                    sourceId,
                    data,
                    sourceName: source.name
                });
            } catch (error) {
                console.error(`Error in interval for ${sourceId}:`, error);
            }
        }, 10);

        activeIntervals.set(sourceId, interval);
    });

    socket.on('unsubscribe-source', ({ sourceId }) => {
        if (activeIntervals.has(sourceId)) {
            const interval = activeIntervals.get(sourceId);
            clearInterval(interval);
            activeIntervals.delete(sourceId);
            console.log(`Client unsubscribed from source: ${sourceId}`);
        }
    });

    socket.on('add-source', async ({ id, url, name }) => {
        if (!id || !url || !name) {
            socket.emit('error', { message: 'Missing required fields for data source' });
            return;
        }

        let themeColor = '#60a5fa';
        let bgColor = '#1e3a8a';

        if (id.includes('traffic')) {
            themeColor = '#10b981';
            bgColor = '#064e3b';
        } else if (id.includes('weather')) {
            themeColor = '#a855f7';
            bgColor = '#4c1d95';
        } else if (id.includes('bus')) {
            themeColor = '#f97316';
            bgColor = '#7c2d12';
        }

        const newSource = {
            id,
            url,
            name,
            theme: {
                color: themeColor,
                backgroundColor: bgColor
            }
        };

        try {
            // Create or update the data source in MongoDB
            await DataSource.findOneAndUpdate(
                { id: id },
                newSource,
                { upsert: true, new: true }
            );

            // Update the local cache
            dataSources.set(id, newSource);
            io.emit('available-sources', Array.from(dataSources.values()));
            console.log(`New data source added to MongoDB: ${name} (${id}) - ${url}`);
        } catch (error) {
            console.error('Error adding data source to MongoDB:', error);
            socket.emit('error', { message: 'Failed to save data source to database' });
        }
    });

    socket.on('delete-source', async ({ sourceId }) => {
        if (dataSources.has(sourceId)) {
            try {
                // Delete from MongoDB
                await DataSource.deleteOne({ id: sourceId });

                // Update local cache
                const sourceName = dataSources.get(sourceId).name;
                dataSources.delete(sourceId);
                io.emit('available-sources', Array.from(dataSources.values()));
                console.log(`Data source deleted from MongoDB: ${sourceName} (${sourceId})`);
            } catch (error) {
                console.error('Error deleting data source from MongoDB:', error);
                socket.emit('error', { message: 'Failed to delete data source from database' });
            }
        } else {
            socket.emit('error', { message: `Source with ID ${sourceId} not found` });
        }
    });

    socket.on('disconnect', () => {
        for (const interval of activeIntervals.values()) {
            clearInterval(interval);
        }
        activeIntervals.clear();
        console.log(`Disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Socket.io server running on port ${PORT}`);
    console.log(`Using dark theme for UI`);
});

export { io };
