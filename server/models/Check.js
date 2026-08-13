import mongoose from 'mongoose';

const sourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  }
});

const checkSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  verdict: {
    type: String,
    required: true,
    enum: ['TRUE', 'FALSE', 'MISLEADING', 'UNVERIFIED'],
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  reasoning: {
    type: String,
    required: true,
  },
  sources: [sourceSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const Check = mongoose.model('Check', checkSchema);

export default Check;
