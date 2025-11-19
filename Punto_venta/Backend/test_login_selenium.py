from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import time
from datetime import datetime

# Cambia la URL si tu login está en otro puerto/ruta
LOGIN_URL = "http://localhost:5173/login"
USERNAME = "admin"
PASSWORD = "admin"
LOGOUT_BTN_XPATH = '//button[contains(text(), "Cerrar sesión") or contains(text(), "Logout") or @id="logout"]'

# Inicializa el navegador (Chrome) correctamente
service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service)

start_time = time.time()
login_success = 0
login_fail = 0
logout_success = 0
logout_fail = 0

with open("login_logout_results.txt", "w", encoding="utf-8") as f:
    for i in range(5):
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        driver.get(LOGIN_URL)
        time.sleep(2)  # Espera a que cargue la página

        # Encuentra los campos de usuario y contraseña
        usuario_input = driver.find_element(By.XPATH, '//input[@type="text" or not(@type)]')
        password_input = driver.find_element(By.XPATH, '//input[@type="password"]')

        # Ingresa las credenciales
        usuario_input.clear()
        password_input.clear()
        usuario_input.send_keys(USERNAME)
        password_input.send_keys(PASSWORD)

        # Envía el formulario
        password_input.send_keys(Keys.RETURN)

        time.sleep(3)  # Espera a que procese el login

        # Verifica si el login fue exitoso (puedes ajustar esto según tu app)
        if driver.current_url != LOGIN_URL:
            msg = f"[{i+1}] {now} Login exitoso!"
            print(msg)
            f.write(msg + "\n")
            login_success += 1
            # Intentar cerrar sesión
            try:
                logout_btn = driver.find_element(By.XPATH, LOGOUT_BTN_XPATH)
                logout_btn.click()
                msg = f"[{i+1}] {now} Logout exitoso!"
                print(msg)
                f.write(msg + "\n")
                logout_success += 1
            except Exception as e:
                msg = f"[{i+1}] {now} No se encontró el botón de logout: {e}"
                print(msg)
                f.write(msg + "\n")
                logout_fail += 1
        else:
            msg = f"[{i+1}] {now} Login fallido."
            print(msg)
            f.write(msg + "\n")
            login_fail += 1

        time.sleep(2)

    total_time = time.time() - start_time
    resumen = f"\n--- RESULTADOS GENERALES ---\n"
    resumen += f"Logins exitosos: {login_success}\n"
    resumen += f"Logins fallidos: {login_fail}\n"
    resumen += f"Logouts exitosos: {logout_success}\n"
    resumen += f"Logouts fallidos: {logout_fail}\n"
    resumen += f"Tiempo total: {total_time:.2f} segundos\n"
    print(resumen)
    f.write(resumen)

driver.quit()
