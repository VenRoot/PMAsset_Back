const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const children = [];

process.on('SIGINT', function() {
    console.log("Caught interrupt signal");
    console.log('killing', children.length, 'child processes');
    children.forEach(function(child) {
      console.log("killing ", child.pid," child process");
      child.kill();
    });
  });


//Check if windows or linux
if (os.platform() === 'win32') {
    //run npm run start:windows and redirect output to console
    const npm = spawn('npm', ['run', 'start:windows'], {
        stdio: 'ignore'
    });
    children.push(npm);

    npm.on("spawn", () => console.log("started on windows"));
    // npm.stdout.on('data', (data) => console.log(data.toString()));
    // npm.stdout.on('data', (data) => console.error(data.toString()));
    npm.on('exit', code => console.log('child process exited with code ' + code.toString()));
}
else if(os.platform() == "linux") {

    spawnSync("chmod", ["+x", "./copy.sh"]);

    const npm = spawn('npm', ['run', 'start:linux']);
    children.push(npm);

    npm.on("spawn", () => console.log("started on linux"));
    npm.on("error", (err) => console.error(err));
    npm.stdout.setEncoding("utf8");
    npm.stdout.on("data", (data) => console.log(data.toString()));
    npm.stdout.on("error", (data) => console.error(data.toString()));

    npm.on('exit', code => console.log('child process exited with code ' + code));
}