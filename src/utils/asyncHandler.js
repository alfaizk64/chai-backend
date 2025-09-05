
const asyncHandler  = (fn) =>{
  return  (req,res,next) =>{
        Promise.resolve(fn(req,res,next)).catch((err)=>{
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
