const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const accountRoutes = require('./routes/account');
const adminRoutes = require('./routes/admin');
const limitarTentativas = require('./middleware/rateLimit');
const { naoEncontrado, errorHandler } = require('./middleware/errorHandler');

const app = express();

// crossOriginResourcePolicy liberado para o app (web e celular) carregar as imagens de /img
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(express.json({ limit: '6mb' })); // imagens do admin chegam em base64
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.use('/img', express.static(path.join(__dirname, '..', 'public', 'img'), { maxAge: '1d' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'Zentor API' }));
// No máximo 10 tentativas por minuto por IP em login e recuperação de senha (contra força bruta).
app.use(['/api/auth/login', '/api/auth/esqueci-senha', '/api/auth/redefinir-senha'], limitarTentativas({ maximo: 10, janelaMs: 60_000 }));
app.use('/api/auth', authRoutes);
app.use('/api/produtos', productRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', orderRoutes);
app.use('/api', accountRoutes);

app.use(naoEncontrado);
app.use(errorHandler);

module.exports = app;
