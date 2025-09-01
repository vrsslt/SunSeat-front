import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 10000,
});

console.log("API configured with baseURL:", "http://localhost:5000/api");
