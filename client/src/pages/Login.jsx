import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await API.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      navigate("/dashboard");
    } catch (error) {
      console.error("Ошибка входа:", error);
      alert("Ошибка входа: " + error.response.data.error);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>Вход</h2>
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <br /><br />
      <input
        placeholder="Пароль"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br /><br />
      <button onClick={handleLogin}>Войти</button>
      <br></br> 
      <p>
        Нет аккаунта? <a href="/register">Зарегистрироваться</a>
    </p>
    </div>
  );
}
