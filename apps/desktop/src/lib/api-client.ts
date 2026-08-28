import axios from "axios";

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL?? "http://localhost:3000",
    withCredentials:true,
    headers:{
        "Content-Type":"application/json"
    }
})



//global error handler when unauthenticated
apiClient.interceptors.response.use(
    (response)=>response,
    (error)=>{
        if(error.response?.status === 401){
            // On desktop, don't redirect — cloud API calls may fail
            // because session cookies aren't available cross-origin.
            // The app works fine with just the local SQLite DB.
        }
        return Promise.reject(error)
    }
)

export default apiClient