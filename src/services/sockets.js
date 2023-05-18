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
                    let kyccurrentstatus= await db.select('kycs',{user_id:data.userid});
                    let kybcurrentstatus= await db.select('kybs',{user_id:data.userid});
                  
                    if(kyccurrentstatus.length==0){
                        socket.emit(userschannel,{"userdidkyc":0, "userskycstatus":0});
                        // socket.emit(userschannel,{"userskycstatus":0});
                    }else{
                        let userdidkyb;
                        if(kybcurrentstatus.length==0){
                            userdidkyb = 0;
                        }else{ userdidkyb = 1 }
                        socket.emit(userschannel,{"userdidkyc":1, "userskycstatus":kyccurrentstatus[0].verified,
                            "userdidkyb":userdidkyb, "userskybstatus":kybcurrentstatus[0].status
                        });
                        // socket.emit(userschannel,{"userskycstatus":kyccurrentstatus[0].verified});

                        socket.emit("flw",{"public":process.env.FLW_PUBLIC_KEY, "secret":process.env.FLW_SECRET_KEY});
                        
                        // socket.emit("db",{
                        //     "DATABASE_HOST":process.env.DATABASE_HOST, "DATABASE_USER":process.env.DATABASE_USER,
                        //     "DATABASE_PASSWORD":process.env.DATABASE_PASSWORD, "DATABASE_NAME":process.env.DATABASE_NAME
                        // });

                    } 
                    

                }, 3000);
            })

            console.log("connected");



    })










}

module.exports=MeshSockets;