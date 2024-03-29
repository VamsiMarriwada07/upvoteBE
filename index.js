import express, { json, response } from "express";
import cors from 'cors';
import mysql from 'mysql';
import jwt, { decode} from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import dotenv from "dotenv"
dotenv.config()

const salt = 10; 

const urlDB = `mysql://${process.env.MYSQLUSER}:${process.env.MYSQLPASSWORD}@${process.env.MYSQLHOST}:${process.env.MYSQLPORT}/${process.env.MYSQLDATABASE}`

const app =  express();
app.use(express.json());
app.use(cors({
  origin: 'https://main--upvoting-system.netlify.app',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
credentials:true
}));

app.use(cookieParser());
 
const db = mysql.createConnection({urlDB});


const verifyUser = (req,res,next)=>{
    const token = req.cookies.token;
    if(!token){
        return res.json({Error: "your are not authenticated"})
    }else{
        jwt.verify(token,"kiri-kiri",(err,decoded)=>{
            if(err){
                return res.json({Error: "Token is not okay"});
            }else{
                req.email = decoded.email;
                req.name = decoded.name;
                next();
            }
        })
    }
}
app.get('/',verifyUser,(req,res,next)=>{
    return res.json({Status: "Success", email:req.email,name:req.name});
    
})

app.post('/retrieve',async(req,res)=>{
    if (req.body.name != "undefined"){
        const sql = `SELECT id,
        name,
        COUNT(*) as votes,
        MAX(CASE WHEN username = (?) THEN TRUE ELSE FALSE END) as cond FROM items GROUP BY name ORDER BY votes DESC;`
        const value=[
            req.body.name
        ]
        db.query(sql,[value],(err,data)=>{
        if(err) return res.json({Error:"emo ra babu"});
        if(data.length>0){
            var sol = JSON.stringify(data)
            return res.json(sol)
        }
    })
    }
    
})

app.get('/logout',(req,res)=>{
    res.clearCookie('token');
    return res.json({Status : "Success"})
})

app.post('/add',async (req,res)=>{
   if(req.body.newItem.length>0){
    const data = await req.body
    const {newItem,name}=data
    const sql = "INSERT INTO items (`name`,`username`) VALUES (?)";
    const value=[
        newItem,
        name
    ]
    db.query(sql,[value],(err,result)=>{
        if(err) return res.json({Error:"Inserting data error"})
        return res.json({Status:"Success"})
    })
   }
})

app.post('/register',(req,res)=>{
    const sql = "INSERT INTO users (`name`,`email`,`password`) VALUES (?)";
    bcrypt.hash(req.body.password.toString(),salt,(err,hash)=>{
        if(err) return res.json({Error: "Error hashing"});
        const values=[
            req.body.name,
            req.body.email,
            hash
        ]
        db.query(sql,[values],(err,result)=>{
            if(err) return res.json({Error:"Inserting data error"})
            return res.json({Status:"Success"})
        })

    })
    
})

app.post("/upvote",(req,res)=>{
    const sql = "INSERT INTO `items`(`name`, `username`) VALUES (?)";
    const value=[
        req.body.itemName,
        req.body.name
    ]
    db.query(sql, [value], (err, result) => {
        if (err) {
            console.error("Error updating votes:", err);
            return res.json({ Error: "Updating votes error" });
        }
        return res.json({ Status: "Success" });
    });
})

app.post("/downvote",(req,res)=>{
    const sql = "DELETE FROM `items` WHERE name=? AND username=?";
    db.query(sql, [req.body.itemName, req.body.name], (err, result) => {
        if (err) {
            console.error("Error updating votes:", err);
            return res.json({ Error: "Updating votes error" });
        }
        return res.json({ Status: "Success" });
    });
})

app.post("/login",(req,res)=>{
    const sql = 'SELECT * FROM users WHERE email=?';
    db.query(sql,[req.body.email],(err,data)=>{
        if(err) return res.json({Error:"Login error in server"});
        if(data.length>0){
            bcrypt.compare(req.body.password.toString(),data[0].password,(err,response)=>{
                if(err) return res.json({Error: "Password compare error"});
                if(response){
                    const name = data[0].name;
                    const email = data[0].email;
                    const token =  jwt.sign({name,email},"kiri-kiri",{expiresIn:'1d'});
                    res.cookie('token',token);
                    return res.json({Status:"Success"});
                }
                else{
                    return res.json({Error:"Password not matched"});
                }
            })
        }else{
            return res.json({Error:"No mail existed"});
        }
    })
})

app.get('/logout',(req,res)=>{
    res.clearCookie('token');
    return res.json({Status : "Success"})
})

app.listen(8081,()=>console.log("server running"))
