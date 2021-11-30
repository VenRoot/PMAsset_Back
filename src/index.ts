import express from 'express';
import {Response} from "express";
import fs from 'fs';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import {checkUser} from "./ad";
import {decrypt, encrypt, generateKey} from "./crypto";
import {IAuthRequest} from "./interface";
import {Sessions} from "./session";

(async () => {
    checkUser("***REMOVED***", "***REMOVED***", (value) => {
        console.log(value);
    }).catch(err => {
        console.log(err);
    });
    let key = generateKey();
    let data = await encrypt("***REMOVED***", generateKey());

    console.log(data);
    let owo = await decrypt(data);
    console.log(owo);


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

app.get("/auth", (req, res) => {
    if(req.headers.auth === undefined) return endRes(res, 401, "No auth header");
    let auth = JSON.parse(req.headers.auth as string) as IAuthRequest;
    console.log("Auth: ", auth);
    
    if(auth.type === "RequestKey") return assignNewKey(res);
    else if(auth.type === "AuthUser") {
        if(auth.username === undefined || auth.password === undefined) return endRes(res, 401, "No username or password");
            checkUser(auth.username, auth.password, (value) => {
                if(value) {
                    let session = Sessions.findIndex(session => session.id === auth.SessionID);
                    if(session === -1) return endRes(res, 401, "Session not found");
                    Sessions[session].user = {username: auth.username as string, authenticated: true};
                    console.log(Sessions[session]);
                    
                    return endRes(res, 200, "Success");
                }
            }).catch(err => {
                return endRes(res, 401, err);
            });
    }
    else return endRes(res, 401, "Invalid auth type");

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

const endRes = (res:Response, status:number, message:string) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
        message: message,
        status: status
    }));
}

const assignNewKey = async (res:Response) => {
    let key = generateKey();
    console.log(key);
    
    while(Sessions.find(session => session.id === key)) key = generateKey();
    console.log("NewKey");
    
    Sessions.push({id: key});
    return endRes(res, 200, key);
};
