require("dotenv").config();
console.log("HOST:", process.env.DB_HOST);
console.log("PORT:", process.env.DB_PORT);
const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req,res)=>res.json({online:true,name:"Midnight API"}));

app.get("/streamers", async (req,res)=>{
 const [rows] = await db.query("SELECT * FROM streamers ORDER BY nome");
 res.json(rows);
});
app.delete('/streamer/:id', async (req, res) => {
    try {

        await db.query(
            'DELETE FROM streamers WHERE id = ?',
            [req.params.id]
        );

        res.json({
            success: true
        });

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }
});

app.get('/delete/:id', async (req, res) => {

    await db.query(
        'DELETE FROM streamers WHERE id = ?',
        [req.params.id]
    );

    res.json({
        success: true
    });

});

app.get('/users', async (req, res) => {
    try {

        const [rows] = await db.query(`
            SELECT *
            FROM users
        `);

        res.json(rows);

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }
});
app.get('/test/addstreamer', async (req,res)=>{

    const nome = "Teste_" + Date.now();

    await db.query(`
        INSERT INTO streamers
        (nome, twitch_id, status)
        VALUES
        (?, ?, ?)
    `,[nome,nome,"online"]);

    res.json({
        success:true,
        nome
    });

});

app.get('/schema', async (req, res) => {
    try {

        const [tables] = await db.query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = ?
        `, [process.env.DB_NAME]);

        const schema = {};

        for (const table of tables) {

            const [columns] = await db.query(`
                SHOW COLUMNS FROM \`${table.TABLE_NAME}\`
            `);

            schema[table.TABLE_NAME] = columns;
        }

        res.json(schema);

    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});

app.listen(process.env.PORT || 3000, ()=>{
 console.log("API ONLINE");
});
