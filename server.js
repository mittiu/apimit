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
app.post("/openlive", async (req, res) => {
 console.log(req.body);
    try {
        const { id } = req.body;

        const [streamer] = await db.query(
            "SELECT * FROM streamers WHERE id = ?",
            [id]
        );

        if (streamer.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Streamer não encontrado."
            });
        }

        await db.query(
            "UPDATE streamers SET status = 'online' WHERE id = ?",
            [id]
        );

        await db.query(
            "INSERT INTO streamer_sessions (streamer_id, entrada) VALUES (?, NOW())",
            [id]
        );

        res.json({
            success: true,
            message: "Live iniciada."
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});
app.post("/offlive", async (req, res) => {
    try {
        const { id } = req.body;

        const [streamer] = await db.query(
            "SELECT * FROM streamers WHERE id = ?",
            [id]
        );

        if (streamer.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Streamer não encontrado."
            });
        }

        await db.query(
            "UPDATE streamers SET status = 'offline' WHERE id = ?",
            [id]
        );

        await db.query(
            `UPDATE streamer_sessions
             SET saida = NOW()
             WHERE streamer_id = ?
             AND saida IS NULL
             ORDER BY id DESC
             LIMIT 1`,
            [id]
        );

        res.json({
            success: true,
            message: "Live finalizada."
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
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
