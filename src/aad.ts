import {allowedUsers} from "./ad";
import decode from "jwt-decode";

export const validateAAD = (token: string) => 
{
    try
    {
        return decode(token);
    }
    catch (err)
    {
        return null;
    }
}

export const checkAllowedUser = (user: string) => allowedUsers.includes(user.split("@")[0]);