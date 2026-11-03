const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: [true, 'O nome de usuário é obrigatório'],
      unique: true,
      trim: true,
      minlength: [3, 'O nome deve ter pelo menos 3 caracteres'],
      maxlength: [50, 'O nome não pode exceder 50 caracteres'],
    },
    senha: {
      type: String,
      required: [true, 'A senha é obrigatória'],
      minlength: [6, 'A senha deve ter pelo menos 6 caracteres'],
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Gatilho pré-save: Hasheamento de senha com bcryptjs (salt >= 10)
userSchema.pre('save', async function (next) {
  if (!this.isModified('senha')) return next();
  const salt = await bcrypt.genSalt(10);
  this.senha = await bcrypt.hash(this.senha, salt);
  next();
});

// Método de instância para conferência de credenciais
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.senha);
};

module.exports = mongoose.model('User', userSchema);
