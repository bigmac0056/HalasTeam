import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  return (
    <div style={{ padding: 40 }}>
      <h1>Smart Home System</h1>
      <p>
        Централизованное управление устройствами, автоматизация сценариев
        и анализ погодных условий в одном месте.
      </p>

      <br />

      {!token ? (
        <>
          <button onClick={() => navigate("/login")}>
            Войти
          </button>

          <button
            style={{ marginLeft: 10 }}
            onClick={() => navigate("/register")}
          >
            Зарегистрироваться
          </button>
        </>
      ) : (
        <button onClick={() => navigate("/dashboard")}>
          Перейти в панель управления
        </button>
      )}

      <hr style={{ margin: "40px 0" }} />

      <h2>Возможности системы</h2>

      <ul>
        <li>Управление устройствами из одного интерфейса</li>
        <li>Автоматические рекомендации на основе погоды</li>
        <li>Поддержка расширения браузера</li>
        <li>Гибкая архитектура и масштабируемость</li>
      </ul>
    </div>
  );
}
