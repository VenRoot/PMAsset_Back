import express from 'express';
import fs from 'fs';
const app = express();

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