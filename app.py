import streamlit as st
from utils import front
import logging 
import plotly.graph_objects as go
from datetime import datetime, date
from scripts import download_data_day_france as dd
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

st.title("Hey, welcome to allergy pollen site")
dataset_path = "data/raw_data/copernicus/ENS_FORECAST.nc"

address = st.text_input("Enter your adress in France here", value="Paris 10, France")

if address: 
    lat, lon, city_name = front.get_coordinates(address)

    logging.info(f"Latitude: {lat}, Longitude: {lon}, City: {city_name}")
    dataset = front.load_dataset(dataset_path)
    df_hours,df_days, formatted_date = front.load_preprocess(dataset, lat,lon)
    st.plotly_chart(front.plot_pollen_concentration_hours(df_hours, formatted_date, address))
    st.plotly_chart(front.plot_pollen_concentration_days(df_days, formatted_date, address))
    date_obj = date.today()
    if formatted_date != f"{date_obj.year}, {date_obj.strftime('%B')}, {date_obj.day}":
            print(formatted_date)
            print(date.today())
            st.warning("⚠️ Data is outdated! Downloading new data...")

            with st.status("Downloading new data, please wait...", expanded=True) as status:
                logging.info("Data Not Up to Date, Downloading new Data")
                dd.retrieve_data()
                status.update(label="✅ Download complete!", state="complete", expanded=False)

            st.success("New data has been successfully downloaded. Please refresh the page.")

    


