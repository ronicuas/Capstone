from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import time

LOGIN_URL = "http://localhost:5173/login"
SHOP_URL = "http://localhost:5173/shop"
USERNAME = "admin"
PASSWORD = "admin"

service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service)
driver.get(LOGIN_URL)
time.sleep(2)

# Login
usuario_input = driver.find_element(By.XPATH, '//input[@type="text" or not(@type)]')
password_input = driver.find_element(By.XPATH, '//input[@type="password"]')
usuario_input.send_keys(USERNAME)
password_input.send_keys(PASSWORD)
password_input.send_keys(Keys.RETURN)
time.sleep(3)

ventas_realizadas = 0
results = []
for i in range(5):
    driver.get(SHOP_URL)
    time.sleep(2)
    # Selecciona el primer producto disponible
    productos = driver.find_elements(By.CSS_SELECTOR, ".prod")
    if not productos:
        msg = f"[{i+1}] No hay productos disponibles para la venta."
        print(msg)
        results.append(msg)
        break
    productos[0].click()
    time.sleep(1)
    # Pagar
    pagar_btn = driver.find_element(By.XPATH, '//button[contains(text(), "Pagar")]')
    pagar_btn.click()
    time.sleep(2)
    # Selecciona efectivo
    efectivo_btn = driver.find_element(By.XPATH, '//button[contains(text(), "Efectivo") or contains(text(), "efectivo")]')
    efectivo_btn.click()
    time.sleep(1)
    # Obtiene el total a pagar
    total_txt = driver.find_element(By.CSS_SELECTOR, ".total-big").text
    total_num = int(''.join(filter(str.isdigit, total_txt)))
    monto_recibido = total_num + 1000  # Da más dinero que el total
    # Ingresa el monto recibido
    cash_input = driver.find_element(By.CSS_SELECTOR, 'input[type="number"]')
    cash_input.clear()
    cash_input.send_keys(str(monto_recibido))
    time.sleep(1)
    # Validar pago
    validar_btn = driver.find_element(By.XPATH, '//button[contains(text(), "Validar pago")]')
    validar_btn.click()
    time.sleep(3)
    # Espera pantalla de boleta y realiza nueva venta
    nueva_venta_btn = driver.find_element(By.XPATH, '//button[contains(text(), "Nueva venta")]')
    nueva_venta_btn.click()
    ventas_realizadas += 1
    msg = f"[{i+1}] Venta realizada correctamente."
    print(msg)
    results.append(msg)
    time.sleep(2)

driver.quit()
results.append(f"Total de ventas realizadas: {ventas_realizadas}")
with open("pos_results.txt", "w", encoding="utf-8") as f:
    for line in results:
        f.write(line + "\n")
print(f"Total de ventas realizadas: {ventas_realizadas}")
