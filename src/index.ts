import dotenv from "dotenv";
import path from "path";
dotenv.config({path: path.join(__dirname, "../.env")});

import express from 'express';
import {Response} from "express";
import fs from 'fs';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import {checkUser} from "./ad";
import {decrypt, encrypt, generateKey} from "./crypto";
import {IAuthRequest, IGetEntriesRequest} from "./interface";
import {checkAlreadyLoggedIn, Sessions} from "./session";
import { getEntries } from "./sql";

import https from "https";

if(process.env.TEST_USER === undefined || process.env.TEST_PASSWD === undefined) throw new Error("No test user or password");

(async () => {
    checkUser(process.env.TEST_USER as string, process.env.TEST_PASSWD as string, (value) => {
        console.log(value);
    }).catch(err => {
        console.log(err);
    });
    let key = generateKey();
    let data = await encrypt(process.env.TEST_PASSWD as string, generateKey());

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

app.get("/auth", async (req, res) => {
    if(req.headers.auth === undefined) return endRes(res, 400, "No auth header");
    let auth = JSON.parse(req.headers.auth as string) as IAuthRequest;
    console.log("Auth: ", auth);
    
    if(auth.type === "RequestKey") return assignNewKey(res); //
    else if(auth.type === "AuthUser") {
        if(auth.username === undefined || auth.password === undefined) return endRes(res, 401, "No username or password"); //Check if username and password are set
            let session = Sessions.findIndex(session => session.id === auth.SessionID); 
            if(session === -1) return endRes(res, 404, "Session not found"); //Check if session is found
            checkUser(auth.username, auth.password, async (value) => {
                if(value) {
                    
                    if(Sessions[session].user?.authenticated) return endRes(res, 403, "Session already has a user logged in"); //Check if user is already logged in
                    if(checkAlreadyLoggedIn(auth.username as string)) return endRes(res, 403, "The User is already logged in from another session!");  //Check if the user is already logged in from another session
                    Sessions[session].user = {username: auth.username as string, authenticated: true};
                    console.log(Sessions[session]);
                    Sessions[session].date = new Date(); //Update session date to keep it alive
                    return endRes(res, 200, "Successfully logged in");
                }
            }).catch(err => endRes(res, 401, err));
    }
    else if(auth.type === "Logout")
    {
        let session = Sessions.findIndex(session => session.id === auth.SessionID);
        if(session === -1) return endRes(res, 404, "Session not found or expired");
        Sessions.splice(session, 1);
        return endRes(res, 200, "Successfully logged out");
    }
    else return endRes(res, 401, "Invalid auth type");

});

app.get("/getEntries", async (req, res) => {
    if(req.headers.auth === undefined) return endRes(res, 400, "No auth header");
    let request = JSON.parse(req.headers.req as string) as IGetEntriesRequest;
    if(request.username === undefined || request.SessionID === undefined) return endRes(res, 401, "No username or sessionID");
    let session = Sessions.findIndex(session => session.id === request.SessionID);
    if(session === -1) return endRes(res, 404, "Session not found");
    if(!Sessions[session].user?.authenticated) return endRes(res, 403, "User not authenticated");
    if(Sessions[session].user?.username !== request.username) return endRes(res, 403, "User not authenticated");

    let result = await getEntries(res);
    if(typeof result == "string") endRes(res, 200, result);
});

// app.get("/getSession", (req, res) => {
//     console.log(Sessions);
//     return endRes(res, 200, JSON.stringify(Sessions));
// });

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

const credentials: https.ServerOptions = {
    key: fs.readFileSync(path.join(__dirname, '..', 'keys', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '..', 'keys', 'cert.pem')),
    maxVersion: 'TLSv1.3',
    minVersion: 'TLSv1.3'
};

https.createServer(credentials, app).listen(5000, "0.0.0.0", () => {
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
    while(Sessions.find(session => session.id === key)) key = generateKey();    
    Sessions.push({id: key, date: new Date()});
    return endRes(res, 200, key);
};
