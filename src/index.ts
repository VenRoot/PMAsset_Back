import express from 'express';
const app = express();

app.get("/", (req, res) => {
    console.log("GET");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
        message: "Hello World",
        status: 200,
        req: req,
        res: res
    }));
    console.log(req, res);
});


app.post("/", (req, res) => {
    console.log("Post");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
        message: "Hello World",
        status: 200,
        req: req,
        res: res
    }));
    console.log(req, res);

});

app.put("/", (req, res) => {
    console.log("Put");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
        message: "Hello World",
        status: 200,
        req: req,
        res: res
    }));
    console.log(req, res);

});

app.delete("/", (req, res) => {
    console.log("Delete");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
        message: "Hello World",
        status: 200,
        req: req,
        res: res
    }));
    console.log(req, res);
});


app.listen(5000, () => {
    console.log("Server is running on port 5000");
});