import axios from "axios";
export var api = axios.create({
    baseURL: "http://localhost:5000/api",
    timeout: 10000,
});
console.log("API configured with baseURL:", "http://localhost:5000/api");
