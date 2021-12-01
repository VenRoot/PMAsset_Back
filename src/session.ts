import s from "node-schedule";
interface Session
{
    id: string;
    user?: {
        username: string;
        authenticated: boolean;
    }
    date: Date;
}

export const Sessions:Session[] =
[

];

const checkSessions = ():void =>
{
    Sessions.forEach(session =>
    {
        if (session.date.getTime() + (1000 * 60 * 60) < new Date().getTime())
        {
            Sessions.splice(Sessions.indexOf(session), 1);
        }
    });
}


s.scheduleJob("*/10 * * * *", checkSessions);