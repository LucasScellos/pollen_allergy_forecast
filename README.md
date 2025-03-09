![Poetry Install Check](https://github.com/LucasScellos/pollen_allergy_forecast/actions/workflows/poetry-install-check.yml/badge.svg)

# 🌿 Pollen Allergy Forecast  
**Real-time pollen concentration forecasts using Copernicus data**  

## 🚀 Overview  
Pollen allergies affect millions of people worldwide, making it essential to stay informed about pollen levels. This project provides an interactive **Streamlit web application** that helps users:  

✅ Track pollen concentrations in their location  
✅ Identify high pollen days and take precautions  
✅ Decide when to take antihistamine medication  
✅ View forecasts powered by **Copernicus Atmosphere Monitoring Service (CAMS)**  

This project is built using **Python, Streamlit, Xarray, and Plotly**.

---

## 📊 **Live Demo**  
🔗 **[Try the Web App Here](https://pollen-forecast.streamlit.app/)**

---

## 🛠️ **Installation & Setup**  
Follow these steps to set up the project locally.  

### 1️⃣ **Clone the Repository**  
```
git clone https://github.com/LucasScellos/pollen_allergy_forecast.git
cd pollen_allergy_forecast
```
2️⃣ Install Dependencies
Ensure you have Python 3.11+ and Poetry installed. Then run:

```
pip install poetry  # If not installed
poetry install
```
3️⃣ Run the Streamlit App
```
poetry run streamlit run pages/1_Welcome.py
```
Now open http://localhost:8501 in your browser.

📂 Project Structure
```
pollen_allergy_forecast/
│── pages/
│   ├── 1_Welcome.py            # Welcome page (default landing page)
│   ├── 2_Pollen_Forecast.py     # Main app for pollen forecasts
│── scripts/
│   ├── download_data_day_france.py  # Data retrieval from Copernicus API
│── utils/
│   ├── front.py                 # Data processing and visualization functions
│── data/                         # Stores raw & processed data
│── .github/workflows/            # CI/CD configuration for Poetry checks
│── README.md
│── pyproject.toml                # Project dependencies (Poetry)
│── .gitignore                     # Excluded files

```

# 📡 Data Source
All forecasts are powered by Copernicus Atmosphere Monitoring Service (CAMS), ensuring accuracy and reliability.
🌍 Learn more: https://atmosphere.copernicus.eu/

# 📈 Features
- 🎯 Interactive Pollen Forecasts
- 🌍 Location-based forecasts across France 
- 📊 Hourly & daily pollen trends using Plotly visualizations
- 🔄 Automated Data Fetching
- 🌍 Uses Copernicus API to retrieve real-time pollen data

- 🛠 Daily updates for precise predictions

## 🏗 Planned Features (Coming Soon)
- 🔹 Push Notifications for high pollen alerts
- 🔹 Mobile-friendly UI for better experience
- 🔹 Forecast comparison across multiple cities
- 🔹 Data on all Europe 


# 💡 About This Project
This is a personal project by Lucas Scellos, built in my free time.

🔗 Explore my other projects & contact me: lucasscellos.github.io

### 📌 Star this repo ⭐ if you find it useful! 🚀