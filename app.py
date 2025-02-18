import streamlit as st
from utils import front
import logging 
import plotly.graph_objects as go

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

st.title("Hey, welcome to allergy pollen site")
dataset_path = "data/raw_data/copernicus/ENS_FORECAST.nc"

address = st.text_input("Enter your adress in France here", value="Paris 10, France")

if address: 
    lat, lon, city_name = front.get_coordinates(address)
    logging.info(f"Latitude: {lat}, Longitude: {lon}, City: {city_name}")
    dataset = front.load_dataset(dataset_path)
    df, formatted_date = front.load_preprocess(dataset, lat,lon)
    st.plotly_chart(front.plot_pollen_concentration(df, formatted_date, address))
    


