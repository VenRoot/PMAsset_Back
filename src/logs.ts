import fs from "fs";
import path from "path";
export const writeLog = (message: string, type: "VER" | "INF" | "WAR" | "ERR", Action: ActionType, user: string) => {
    const logpath = path.join(__dirname, "..", "logs");

    //Open or create the log file for the current day and write the message to it
    const date = new Date();
    
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    //Get current time in locale format
    const time = date.toLocaleTimeString();

    const logfile = `${year}-${month}-${day}.log`;
    fs.appendFileSync(path.join(logpath, logfile), `${time} | ${type} | ${Action} | User: ${user}: ${message}\n`);
    return undefined;
}


//PC, Monitor, Phone, Konferenz, PDF, unspecified
type Bereich = "PC" | "Mn" | "Ph" | "Kf" | "PD" | "UN";
type GetSet = "get" | "set";
type ActionType = `${GetSet}${Bereich}`;