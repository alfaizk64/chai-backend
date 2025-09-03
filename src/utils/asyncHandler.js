
const asyncHandler  = (asyncHandler) =>{
    (res,req,next) =>{
        Promise.resolve(asyncHandler(req,res,next)).catch((err)=>{
            next(err)
        })
    }
}

export { asyncHandler };















// 
// const asynchandler = (fn) => async(req,res,next,err) => {
// try {
//      await fn(req,res,next)
// } catch (error) {
//     res.status(err.code|| 500).res.json({
//         success:false,
//         message:err.message
//     })
// }
// };
