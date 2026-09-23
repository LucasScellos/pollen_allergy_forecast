import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from datetime import date
from utils import front
from scripts import download_data_day_france as dd

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

app = FastAPI(title="Pollen Allergy Forecast API")

DATASET_PATH = "data/raw_data/copernicus/ENS_FORECAST.nc"

def ensure_dataset():
    """Check if dataset exists, if not, download it."""
    if not os.path.exists(DATASET_PATH):
        logging.warning("Dataset file not found! Downloading new data...")
        dd.retrieve_data()

@app.get("/api/forecast")
def get_forecast(address: str = "Paris 10, France"):
    ensure_dataset()
    try:
        lat, lon, city_name = front.get_coordinates(address)
        dataset = front.load_dataset(DATASET_PATH)
        df_hours, df_days, formatted_date = front.load_preprocess(dataset, lat, lon)
        
        # Ensure data freshness based on internal dataset time
        today = date.today()
        expected_date = f"{today.year}, {today.strftime('%B')}, {today.day}"
        if formatted_date != expected_date:
            logging.warning(f"Data is outdated ({formatted_date} vs {expected_date})! Downloading new data...")
            dataset.close()  # Close file handle so the download can overwrite the NetCDF
            dd.retrieve_data()
            dataset = front.load_dataset(DATASET_PATH)
            df_hours, df_days, formatted_date = front.load_preprocess(dataset, lat, lon)

        
        # Convert df_days to a list of dicts for JSON serialization
        # df_days columns include pollen types and date fields
        days_data = df_days.to_dict(orient="records")
        
        # Determine current status (max pollen index for today)
        # Using the first day in df_days as today
        today_data = days_data[0] if days_data else {}
        
        return {
            "city_name": city_name,
            "lat": lat,
            "lon": lon,
            "formatted_date": formatted_date,
            "days": days_data
        }
    except Exception as e:
        logging.error(f"Error processing location: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Mount static files folder to serve index.html
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
