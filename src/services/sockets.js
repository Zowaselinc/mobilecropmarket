const { Socket } = require("socket.io");
const { MySQL2Extended }= require('mysql2-extended');
const { createPool } = require('mysql2/promise');

const pool = createPool ({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
});

const db = new MySQL2Extended(pool);
const MeshSockets=(io)=>{

     
    io.on("connection",function (socket){
          
        

            socket.on("isconnected",function(data){
                console.log(data);
            })
            socket.on("kycperson",function(data){
                let userschannel= "ZWSL"+data.userid;
            

                setInterval(async () => {
                // console.log(data.userid);
                    let currentstatus= await db.select('kycs',{user_id:data.userid});
                  
                    if(currentstatus.length==0){
                        socket.emit(userschannel,{"userdidkyc":0, "userskycstatus":0});
                        // socket.emit(userschannel,{"userskycstatus":0});

                    }else{
                        socket.emit(userschannel,{"userdidkyc":1, "userskycstatus":currentstatus[0].verified});
                        // socket.emit(userschannel,{"userskycstatus":currentstatus[0].verified});

                    } 
                    

                }, 3000);
            })

            console.log("connected");



    })










}

module.exports=MeshSockets;