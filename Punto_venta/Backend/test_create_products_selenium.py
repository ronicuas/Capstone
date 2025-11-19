from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import random

LOGIN_URL = "http://localhost:5173/login"
INVENTARIO_URL = "http://localhost:5173/inventario"
USERNAME = "admin"
PASSWORD = "admin"
CATEGORIA = "ejemplo"

nombres = ["Cactus Demo", "Suculenta Demo", "Aloe Vera Demo", "Helecho Demo", "Palma Demo"]

service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service)
wait = WebDriverWait(driver, 10)
driver.get(LOGIN_URL)
time.sleep(2)

# Login
usuario_input = wait.until(EC.presence_of_element_located((By.XPATH, '//input[@type="text" or not(@type)]')))
password_input = driver.find_element(By.XPATH, '//input[@type="password"]')
usuario_input.send_keys(USERNAME)
password_input.send_keys(PASSWORD)
password_input.send_keys(Keys.RETURN)
time.sleep(3)

driver.get(INVENTARIO_URL)
time.sleep(2)

results = []
for i in range(5):

    try:
        wait.until(EC.invisibility_of_element_located((By.CLASS_NAME, 'modal-backdrop')))
    except:
        pass
    nuevo_btn = wait.until(EC.element_to_be_clickable((By.XPATH, '//button[contains(text(), "Nuevo")]')))
    nuevo_btn.click()
    time.sleep(1)
    cat_select = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, 'select.inp')))
    for option in cat_select.find_elements(By.TAG_NAME, 'option'):
        if option.text.strip().lower() == CATEGORIA:
            option.click()
            break
    time.sleep(1)
    # Rellenar campos por label
    # Producto
    producto_input = wait.until(EC.presence_of_element_located((By.XPATH, '//label[span[text()="Producto"]]/input')))
    producto_input.clear()
    producto_input.send_keys(nombres[i])
    # ID (opcional) lo dejamos vacío
    id_input = driver.find_elements(By.XPATH, '//label[span[contains(text(), "ID")]]/input')
    if id_input:
        id_input[0].clear()
    # Precio
    precio_input = wait.until(EC.presence_of_element_located((By.XPATH, '//label[span[text()="Precio"]]/input')))
    precio_input.clear()
    precio_input.send_keys(str(random.randint(1000, 3000)))
    # Stock
    stock_input = wait.until(EC.presence_of_element_located((By.XPATH, '//label[span[text()="Stock"]]/input')))
    stock_input.clear()
    stock_input.send_keys(str(random.randint(5, 20)))
    # SKU
    sku_input = wait.until(EC.presence_of_element_located((By.XPATH, '//label[span[text()="SKU"]]/input')))
    sku_input.clear()
    sku_input.send_keys(f"SKU-{random.randint(10000,99999)}")
    # Código de barras
    barcode_input = wait.until(EC.presence_of_element_located((By.XPATH, '//label[span[text()="Código de barras"]]/input')))
    barcode_input.clear()
    barcode_input.send_keys(str(random.randint(100000000000,999999999999)))
    # Captura de pantalla antes de buscar el botón Guardar
    driver.save_screenshot(f"producto_form_{i+1}.png")
    modal = wait.until(EC.presence_of_element_located((By.CLASS_NAME, 'modal')))
    guardar_btns = modal.find_elements(By.XPATH, './/button[contains(text(), "Crear")] | .//button[contains(text(), "Guardar")]')
    guardar_btn = None
    for btn in guardar_btns:
        if btn.is_displayed() and btn.is_enabled():
            guardar_btn = btn
            break
    if guardar_btn:
        guardar_btn.click()
        time.sleep(2)
        results.append(f"Producto {nombres[i]} creado.")
    else:
        results.append(f"No se encontró el botón Guardar para {nombres[i]}.")
    try:
        wait.until(EC.invisibility_of_element_located((By.CLASS_NAME, 'modal-backdrop')))
    except:
        pass

# Volver al menú principal
driver.get("http://localhost:5173/")
time.sleep(2)
driver.quit()

with open("create_products_results.txt", "w", encoding="utf-8") as f:
    for line in results:
        f.write(line + "\n")
    f.write("Creación de productos finalizada.\n")
print("Creación de productos finalizada.")
