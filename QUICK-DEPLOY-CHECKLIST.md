# Быстрое развертывание eDAHouse на VPS

## Домен: edahouse.ordis.co.il

### Шаг 1: Настройка DNS
Убедитесь что DNS запись настроена:
- **Тип**: A
- **Имя**: edahouse
- **Значение**: IP адрес вашего VPS
- **TTL**: 300 (или Auto)

Проверить настройку: `nslookup edahouse.ordis.co.il`

### Шаг 2: Подготовка Git репозитория
```bash
# На вашем компьютере (где проект Replit)
git init
git add .
git commit -m "Initial commit - eDAHouse delivery system"
git remote add origin https://github.com/your-username/edahouse.git
git push -u origin main
```

### Шаг 3: Установка на VPS
```bash
# Подключение к серверу
ssh root@YOUR_VPS_IP

# Установка проекта (замените YOUR_USERNAME на ваш GitHub username)
curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/edahouse/main/scripts/install-on-vps.sh | bash -s edahouse edahouse.ordis.co.il 3000
```

### Шаг 4: Проверка работы
После установки проверьте:
- https://edahouse.ordis.co.il - основной сайт
- https://edahouse.ordis.co.il/api/health - проверка состояния

### Шаг 5: Обновление проекта (в будущем)
```bash
# На VPS
cd /var/www/edahouse
./update-edahouse.sh
```

## Готовая команда для копирования

Замените `YOUR_USERNAME` и `YOUR_VPS_IP`:

```bash
ssh root@YOUR_VPS_IP
curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/edahouse/main/scripts/install-on-vps.sh | bash -s edahouse edahouse.ordis.co.il 3000
```

## Создание дополнительных сайтов

Если понадобится несколько сайтов на одном VPS:

```bash
# На VPS
cd /var/www/edahouse
./scripts/create-multisite.sh

# Будет предложено ввести:
# - Название нового сайта
# - Домен (например: shop2.ordis.co.il)  
# - Порт (например: 3001)
```

## Мониторинг

```bash
# Статус всех сайтов
pm2 status

# Логи
pm2 logs edahouse

# Перезапуск
pm2 restart edahouse

# Проверка здоровья
curl https://edahouse.ordis.co.il/api/health
```

## Резервное копирование

```bash
# Создание бэкапа
cd /var/www/edahouse
./scripts/backup.sh edahouse

# Автоматическое резервное копирование (каждую ночь в 2:00)
echo "0 2 * * * cd /var/www/edahouse && ./scripts/backup.sh edahouse" | crontab -
```

## В случае проблем

```bash
# Проверка работоспособности
./scripts/health-check.sh edahouse

# Просмотр логов Nginx
sudo tail -f /var/log/nginx/error.log

# Проверка базы данных
sudo -u postgres psql edahouse_db -c "SELECT COUNT(*) FROM products;"
```

**Ваш проект готов к развертыванию на домене edahouse.ordis.co.il!**