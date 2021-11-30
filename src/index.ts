import express from 'express';
import fs from 'fs';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import {checkUser} from "./ad";


(async () => {
    checkUser("***REMOVED***", "!", (value) => {
        console.log(value);
    });
    
})();

// const apiKeyAuth = require('api-key-auth');
const app = express();

app.use(express.json());
app.use(helmet());
app.use(bodyParser.json());
app.use(cors());
app.use(morgan('combined'));

// const getSecret = (keyId:string, done:any) => {
//     if (!apiKeys.has(keyId)) {
//       return done(new Error('Unknown api key'));
//     }
//     const clientApp = apiKeys.get(keyId);
//     done(null, clientApp.secret, {
//       id: clientApp.id,
//       name: clientApp.name
//     });
//   }
  
// app.use(apiKeyAuth({ getSecret }));

app.get('/protected', (req:any, res) => {
    res.send(`Hello ${req.credentials.name}`);
  });

app.get("/", (req, res) => {
    console.log("GET");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
        message: "Hello World",
        status: 200,
        req: {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: req.body
        }
    }));
});

app.post("/", (req, res) => {
    console.log("Post");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.json({
        message: "Hello World",
        status: 200
    });
    console.log(req, res);

});

app.put("/", (req, res) => {
    console.log("Put");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.json({
        message: "Hello World",
        status: 200
    });
    console.log(req, res);

});

app.delete("/", (req, res) => {
    console.log("Delete");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.json({
        message: "Hello World",
        status: 200
    });
    console.log(req, res);
});


app.listen(5000, () => {
    console.log("Server is running on port 5000");
});