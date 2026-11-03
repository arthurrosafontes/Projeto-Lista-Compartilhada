const mongoose = require('mongoose');
const crypto = require('crypto');

function gerarCodigoConviteUnico() {
  return crypto.randomBytes(6).toString('hex');
}

const shoppingListSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: [true, 'O nome da lista compartilhada é obrigatório'],
      trim: true,
      maxlength: [80, 'O nome da lista não pode exceder 80 caracteres'],
    },
    descricao: {
      type: String,
      trim: true,
      default: 'Preços médios: Mooca, Belém e Tatuapé',
      maxlength: [160, 'A descrição não pode exceder 160 caracteres'],
    },
    codigoConvite: {
      type: String,
      unique: true,
      index: true,
      default: gerarCodigoConviteUnico,
    },
    criadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    criadoPorNome: {
      type: String,
      trim: true,
      default: '',
    },
    participantes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    ativa: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

shoppingListSchema.index({ participantes: 1, ativa: 1, updatedAt: -1 });

shoppingListSchema.pre('validate', function (next) {
  if (!this.codigoConvite) {
    this.codigoConvite = gerarCodigoConviteUnico();
  }
  next();
});

module.exports = mongoose.model('ShoppingList', shoppingListSchema);
