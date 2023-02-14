const express = require('express');
const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/', express.static('www'))

app.use(require('./service/api'))

const port = 3000;
app.listen(port, () => {
    console.log(`http://localhost:${port}`)
});

