const express = require('express');
const routes = require('./routes');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const { createSCIMError } = require('./utils/scim');
const { parse } = require('scim2-parse-filter');

const app = express(),
    port = process.env.PORT || 3000;

// using bodyParser to parse JSON bodies into JS objects
app.use(bodyParser.json());

const isAuthorizedUser = (req, res, next) => {
    const authorization = Buffer.from(
        req.headers?.authorization?.split(' ')[1] || '',
        'base64'
    ).toString();

    if (authorization !== process.env.authorization) {
        return res.status(401).send(createSCIMError('Unauthorized', 401));
    }

    return next();
};

const requestParser = (req, res, next) => {
    try {
        const { method, query } = req;

        if (query?.filter) {
            req.query.filter = parse(query.filter);
        }

        if (!query?.startIndex) {
            query.startIndex = 1;
        }

        let requestBody = '';
        if (['get', 'delete'].includes(method.toLowerCase())) {
            return next();
        }

        if (Object.keys(req.body).length === 0) {
            return req.on('data', function (data) {
                requestBody += data;
                let groupJsonData = JSON.parse(requestBody);
                req.body = groupJsonData;
                next();
            });
        }

        next();
    } catch (error) {
        res.status(500).send(createSCIMError('Something went wrong', 500));
    }
};

// adding morgan to log HTTP requests
app.use(morgan('combined'));

// defining an endpoint to return all ads
app.use('/scim/v2', [requestParser], routes);

// starting the server
app.listen(port, () => {
    console.log('RESTful API server started on: ' + port);
});
