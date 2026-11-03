const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    listaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShoppingList',
      required: true,
      index: true,
    },
    nome: {
      type: String,
      required: [true, 'O nome do item é obrigatório'],
      trim: true,
      maxlength: [100, 'Nome do item não pode exceder 100 caracteres'],
    },
    quantidade: {
      type: Number,
      default: 1,
      min: [0.01, 'A quantidade deve ser maior que zero'],
    },
    unidade: {
      type: String,
      default: 'un',
      trim: true,
    },
    categoria: {
      type: String,
      default: 'Geral',
      trim: true,
    },
    precoUnitario: {
      type: Number,
      default: 8.9,
      min: [0, 'O preço unitário não pode ser negativo'],
    },
    precoTotalAproximado: {
      type: Number,
      default: 8.9,
      min: [0, 'O preço total aproximado não pode ser negativo'],
    },
    marcadoParaCompra: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pendente', 'comprado'],
      default: 'pendente',
      index: true,
    },
    observacao: {
      type: String,
      trim: true,
      default: '',
      maxlength: [200, 'Observação não pode exceder 200 caracteres'],
    },
    criadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    criadoPorNome: {
      type: String,
      required: true,
      trim: true,
      default: 'Participante',
    },
    compradoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    compradoPorNome: {
      type: String,
      trim: true,
      default: null,
    },
    compradoEm: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Índices obrigatórios da skill_mongodb.md
itemSchema.index({ status: 1, createdAt: -1 });
itemSchema.index({ listaId: 1, status: 1, createdAt: -1 });
itemSchema.index({ compradoEm: -1 });

// Gatilho pré-save: Atualiza preço total aproximado e metadados de compra
itemSchema.pre('save', function (next) {
  const qtd = Math.max(0.01, Number(this.quantidade) || 1);
  const unit = Math.max(0, Number(this.precoUnitario) || 0);
  this.precoTotalAproximado = Number((unit * qtd).toFixed(2));

  if (this.isModified('status') && this.status === 'comprado' && !this.compradoEm) {
    this.compradoEm = new Date();
  }

  if (this.isModified('status') && this.status === 'pendente') {
    this.compradoPor = null;
    this.compradoPorNome = null;
    this.compradoEm = null;
  }

  next();
});

module.exports = mongoose.model('Item', itemSchema);
