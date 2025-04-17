import mongoose from 'mongoose';

const ModelSchema = new mongoose.Schema({
    name: { type: String, required: true },
    filename: { type: String, required: true },
    path: { type: String, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    tags: [{ type: String }],
    version: { type: Number, default: 1 },
    pois: [{
        name: String,
        description: String,
        type: String,
        position: {
            x: Number,
            y: Number,
            z: Number
        },
        createdAt: { type: Date, default: Date.now }
    }],
}, { timestamps: true });

const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    createdAt: { type: Date, default: Date.now },
});

const DataSourceSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    theme: {
        color: { type: String, default: '#60a5fa' },
        backgroundColor: { type: String, default: '#1e3a8a' }
    }
}, { timestamps: true });

const RealtimeDataSchema = new mongoose.Schema({
    sourceId: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    timestamp: { type: Date, default: Date.now }
});

const POISchema = new mongoose.Schema({
    modelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Model', required: true },
    name: { type: String, required: true },
    description: { type: String },
    type: { type: String, required: true },
    position: {
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        z: { type: Number, required: true },
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});
// Delete old model if it exists (important during dev)
if (mongoose.models.Model) {
    delete mongoose.models.Model;
}

export const Model = mongoose.model('Model', ModelSchema);
export const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);
export const POI = mongoose.models.POI || mongoose.model('POI', POISchema);
export const DataSource = mongoose.models.DataSource || mongoose.model('DataSource', DataSourceSchema);
export const RealtimeData = mongoose.models.RealtimeData || mongoose.model('RealtimeData', RealtimeDataSchema);
