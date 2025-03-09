import xarray as xr
import pandas as pd
import plotly.express as px
import logging
from datetime import datetime, timedelta
from geopy.geocoders import Nominatim
import plotly.graph_objects as go

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

def get_coordinates(address: str):
    """Return latitude, longitude, and formatted city name of a given address."""
    geolocator = Nominatim(user_agent="geo_locator")
    location = geolocator.geocode(address)

    if location is None:
        raise ValueError(f"Location not found for address: {address}")

    city_details = location.address.split(",")
    condensed_city = " ".join([city_details[i] for i in [0, 1, 3] if i < len(city_details)])
    lon_360 = (location.longitude + 360) % 360
    
    return location.latitude, lon_360, condensed_city


def load_dataset(file_path):
    """Loads NetCDF dataset and sorts it by longitude and latitude."""
    logging.info(f"Loading dataset from {file_path}...")
    dataset = xr.open_dataset(file_path)
    return dataset.sortby(["longitude", "latitude"])


def select_nearest_location(dataset, lat, lon, max_distance=0.2):
    """Selects the nearest data point in the dataset based on latitude and longitude."""
    logging.info(f"Selecting nearest data point for lat={lat}, lon={lon}...")
    return dataset.sel(longitude=lon, latitude=lat, method="nearest", tolerance=max_distance)


def extract_date(dataset):
    """Extracts and formats the initial forecast date."""
    try:
        inital_time = dataset.FORECAST.split("Europe, ")[1].split("+")[0]
        date_obj = datetime.strptime(inital_time, '%Y%m%d')
        return f"{date_obj.year}, {date_obj.strftime('%B')}, {date_obj.day}"
    except Exception as e:
        logging.error(f"Error extracting date: {e}")
        return "Unknown Date"


def preprocess_dataframe_hours(dataset):
    """Converts dataset to a dataframe and processes time-related fields."""
    df = dataset.to_dataframe().reset_index()

    # Convert time to hours
    df["hours"] = df["time"].dt.total_seconds() / 3600
    df = df[(df["hours"] >= 5) & (df["hours"] <= 24)]
    df["formatted_hours"] = df["hours"].apply(lambda x: f"{int(x):02d}:{int((x % 1) * 60):02d}")

    return df


def plot_pollen_concentration_hours(df, formatted_date, city_name):
    """Plots pollen concentration over the next 24 hours in a mobile-friendly format."""
    variables = ["apg_conc", "bpg_conc", "gpg_conc", "mpg_conc", "opg_conc"]
    pollen_names = {
        "apg_conc": "Alder Pollen",
        "bpg_conc": "Birch Pollen",
        "gpg_conc": "Grass Pollen",
        "mpg_conc": "Mugwort Pollen",
        "opg_conc": "Olive Pollen"
    }

    df = df[df["hours"] <= 24].copy()
    df_melted = df.melt(id_vars=['formatted_hours'], value_vars=variables, var_name='Pollen Type', value_name='Concentration')
    df_melted['Pollen Type'] = df_melted['Pollen Type'].map(pollen_names)

    fig = px.line(df_melted, x='formatted_hours', y='Concentration', color='Pollen Type',
                  title='Hourly Pollen Concentration Forecast',
                  labels={'formatted_hours': 'Time', 'Concentration': 'Pollen Concentration (grains/m³)'},
                  line_shape="spline")

    fig.update_layout(
        xaxis_title=f"Hours ({formatted_date})",
        yaxis_title='Pollen Concentration (grains/m³)',
        height=400,
        margin=dict(l=60, r=40, t=80, b=80),
        hovermode="x unified"
    )

    fig.update_xaxes(tickangle=-45)

    return fig



def plot_pollen_concentration_days(df, formatted_date, city_name):
    """Plots pollen concentration over the next 4 days in a bar chart for better mobile display."""
    variables = ["apg_conc", "bpg_conc", "gpg_conc", "mpg_conc", "opg_conc"]
    pollen_names = {
        "apg_conc": "Alder Pollen",
        "bpg_conc": "Birch Pollen",
        "gpg_conc": "Grass Pollen",
        "mpg_conc": "Mugwort Pollen",
        "opg_conc": "Olive Pollen"
    }

    fig = go.Figure()
    for pollen in variables:
        fig.add_trace(go.Bar(
            x=df["date_label"],
            y=df[pollen],
            name=pollen_names[pollen],
            hovertemplate=f"%{{x}}<br>{pollen_names[pollen]}: %{{y:.1f}} grains/m³<extra></extra>"
        ))

    fig.update_layout(
        title="Daily Pollen Concentration Forecast",
        xaxis_title="Date",
        yaxis_title="Pollen Concentration (grains/m³)",
        barmode="group",
        height=400,
        margin=dict(l=60, r=60, t=80, b=80),
        hovermode="x unified",
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="center", x=0.5)
    )

    return fig
# def plot_pollen_concentration_days(df, formatted_date, city_name):
    """
    Plots pollen concentrations over time for up to 96 hours (multi-day analysis).
    
    Parameters:
        df (DataFrame): Processed DataFrame containing:
                        - 'hours': time in hours.
                        - 'day': time expressed in days (fractional).
                        - Pollen concentration columns: 'apg_conc', 'bpg_conc', 'gpg_conc', 'mpg_conc', 'opg_conc'.
        formatted_date (str): Label to be used for the x-axis (e.g., a date or date range).
        city_name (str): City name to display as a subtitle below the x-axis.
        
    Returns:
        fig: A Plotly figure with pollen concentration trends plotted over time.
    """
    # List of pollen concentration columns.
    variables = ["apg_conc", "bpg_conc", "gpg_conc", "mpg_conc", "opg_conc"]
    
    # Ensure the DataFrame only contains data up to 96 hours.
    df = df[df["hours"] <= 96].copy()
    
    # Melt the DataFrame for plotting.
    df_melted = df.melt(
        id_vars=['date'],
        value_vars=variables,
        var_name='Pollen Type',
        value_name='Concentration'
    )
    
    # Create the line plot.
    fig = px.line(
        df_melted,
        x='date',
        y='Concentration',
        color='Pollen Type',
        title='Evolution of Pollen Concentrations over Time (Up to 4 Days)',
        labels={'date': 'Date (DD/MM)', 'Concentration': 'Pollen Concentration'},
        line_shape="spline"
    )
    
    # Update layout for a polished appearance.
    fig.update_layout(
        legend_title_text='Pollen Type',
        xaxis_title=formatted_date,
        yaxis_title='Pollen Concentration'
    )
    
    # Add a subtitle (city name) below the x-axis.
    fig.add_annotation(
        x=0.5,
        y=-0.25,
        xref="paper",
        yref="paper",
        text=city_name,
        showarrow=False,
        font=dict(size=12, color="gray")
    )
    
    return fig

def preprocess_dataframe_days(dataset):
    """
    Converts dataset to DataFrame and processes time for multi-day analysis.
    Groups data by day and calculates maximum pollen values for each day.
    
    Parameters:
        dataset: An xarray Dataset containing pollen concentration data
                with a 'time' dimension
    
    Returns:
        df (DataFrame): Processed DataFrame with daily aggregated data
    """
    # Convert dataset to dataframe and reset index
    df = dataset.to_dataframe().reset_index()

    # Get current datetime as the reference point
    current_datetime = datetime.now()

    # Convert the 'time' column to hours
    df["hours"] = df["time"].dt.total_seconds() / 3600
    df = df[df["hours"] <= 96].copy()  # Keep only data for next 4 days (96 hours)

    # Compute actual datetime for each entry
    df["datetime"] = current_datetime + pd.to_timedelta(df["hours"], unit='h')

    # Extract date components for grouping
    df["date"] = df["datetime"].dt.strftime("%d/%m")
    df["year"] = df["datetime"].dt.year
    df["month"] = df["datetime"].dt.month
    df["day"] = df["datetime"].dt.day
    
    # Get the day of the week for better labeling
    df["day_of_week"] = df["datetime"].dt.strftime("%a")
    
    # Create a complete date label for x-axis
    df["date_label"] = df["day_of_week"] + " " + df["date"]
    
    # Create a proper sort key for chronological ordering
    df["sort_key"] = df["datetime"].dt.strftime("%Y%m%d")
    
    # List of pollen concentration columns
    pollen_columns = ["apg_conc", "bpg_conc", "gpg_conc", "mpg_conc", "opg_conc"]
    
    # Group by date and find maximum values for each pollen type
    # This is the core functionality requested - groupby max for days
    daily_df = df.groupby(["date_label", "date", "day_of_week", "sort_key"])[pollen_columns].max().reset_index()
    
    # Sort by date chronologically
    daily_df = daily_df.sort_values("sort_key")
    
    # Add timestamp information for potential time-based filtering
    daily_df["timestamp"] = pd.to_datetime(daily_df["date"].apply(
        lambda x: f"{current_datetime.year}-{x.split('/')[1]}-{x.split('/')[0]}"
    ))
    
    # Create day number relative to current day (0 = today, 1 = tomorrow, etc.)
    base_date = pd.Timestamp(current_datetime.date())
    daily_df["day_number"] = (daily_df["timestamp"] - base_date).dt.days
    
    # Add day descriptions for easier understanding
    day_descriptions = {
        0: "Today",
        1: "Tomorrow", 
        2: "In 2 days",
        3: "In 3 days",
        4: "In 4 days"
    }
    daily_df["day_description"] = daily_df["day_number"].map(day_descriptions)
    
    # Update date labels to include day descriptions
    daily_df["date_label"] = daily_df.apply(
        lambda row: f"{row['day_description']} ({row['date']})" 
        if row['day_number'] <= 1 
        else f"{row['day_of_week']} {row['date']}", 
        axis=1
    )
    
    return daily_df

# def preprocess_dataframe_days(dataset):
    """
    Converts a dataset to a DataFrame and processes time-related fields 
    for multi-day (up to 96 hours) analysis.

    Parameters:
        dataset: An object with a .to_dataframe() method that yields a DataFrame.
                 The DataFrame must include a 'time' column with datetime-like values.

    Returns:
        df (DataFrame): The processed DataFrame with added 'hours', 'day', and 'formatted_time' columns.
                        Only rows with hours <= 96 are retained.
    """
    df = dataset.to_dataframe().reset_index()

    # Get current datetime as the reference point
    current_datetime = datetime.now()

    # Convert the 'time' column to hours
    df["hours"] = df["time"].dt.total_seconds() / 3600
    df = df[df["hours"] <= 96].copy()

    # Compute actual datetime for each entry
    df["datetime"] = current_datetime + pd.to_timedelta(df["hours"], unit='h')

    # Extract date in DD/MM format for plotting
    df["date"] = df["datetime"].dt.strftime("%d/%m")

    # Create a formatted time label (e.g., "Day 2 14:30")
    df["formatted_time"] = df["datetime"].dt.strftime("%d/%m %H:%M")
    
    return df


def load_preprocess(dataset, lat,lon):
    selected_data = select_nearest_location(dataset, lat, lon)
    formatted_date = extract_date(dataset)
    df_hours = preprocess_dataframe_hours(selected_data)
    df_days = preprocess_dataframe_days(selected_data)

    return df_hours, df_days, formatted_date

# def main():
#     """Main function to execute the workflow."""
#     dataset_path = "data/raw_data/copernicus/ENS_FORECAST.nc"
#     address = "15 avenue de l'ouche pellerin, France"

#     try:
#         lat, lon, city_name = get_coordinates(address)
#         logging.info(f"Latitude: {lat}, Longitude: {lon}, City: {city_name}")

#         dataset = load_dataset(dataset_path)
#         selected_data = select_nearest_location(dataset, lat, lon)
#         formatted_date = extract_date(dataset)
#         print(formatted_date)
#         df = preprocess_dataframe(selected_data)

#         plot_pollen_concentration(df, formatted_date, city_name)

#     except Exception as e:
#         logging.error(f"Error in execution: {e}")
