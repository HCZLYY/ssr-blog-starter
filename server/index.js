require('dotenv').config();
const express = require('express');
const cors = require('cors');
const articleRoutes = require('./routes/articles');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/v1/articles', articleRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Express server started on ${port}`));
