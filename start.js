const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');



//Check if windows or linux
if (os.platform() === 'win32') {
    //run npm run start:windows and redirect output to console
    const npm = spawn('npm', ['run', 'start:windows'], {
        stdio: 'inherit'
    });

    npm.on("spawn", () => console.log("started on windows"));
    npm.stdout.on('data', (data) => console.log(data.toString()));
    npm.stdout.on('data', (data) => console.error(data.toString()));
    npm.on('exit', code => console.log('child process exited with code ' + code.toString()));
}
else if(os.platform() == "linux") {

    const npm = spawn('npm', ['run', 'start:linux'], {
        stdio: 'inherit'
    });

    npm.on("spawn", () => console.log("started on linux"));
    npm.stdout.on('data', (data) => console.log(data.toString()));
    npm.stdout.on('data', (data) => console.error(data.toString()));
    npm.on('exit', code => console.log('child process exited with code ' + code.toString()));

}