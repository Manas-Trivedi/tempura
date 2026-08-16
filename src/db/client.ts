import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
    host: "localhost",
    port: 5432,
    user: "tempura",
    password: "tempura",
    database: "tempura"
});