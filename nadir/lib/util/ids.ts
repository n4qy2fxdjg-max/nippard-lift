import { customAlphabet, nanoid } from 'nanoid';

/** Room codes avoid easily confused characters (0/O, 1/I/L). */
const roomAlphabet = customAlphabet('23456789ABCDEFGHJKMNPQRSTUVWXYZ', 5);
export const generateRoomCode = () => roomAlphabet();
export const generateToken = () => nanoid(32);
export const generateSurveyToken = () => nanoid(12);
export const generateId = () => nanoid(16);

export const TEAM_COLORS = ['#7dd3fc', '#f9a8d4', '#fcd34d', '#86efac', '#c4b5fd', '#fdba74', '#67e8f9', '#fca5a5'];
