import json
from flask import Flask, request, redirect, render_template, Response, jsonify
import pandas as pd
from data import load_dataset,get_year_frames, get_mds_data, get_pca_frames
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

dataset = None

@app.route('/pie_charts', methods = ['GET'])
def pie_chart_data():
    frame, year_frames = load_dataset('./WDIData.csv')
    for year in year_frames:
        year_frames[year] = year_frames[year].isnull().sum(axis = 1).to_dict()
    return jsonify(year_frames)

@app.route('/year_frames', methods = ['GET'])
def get_year_frames_data():
    response = get_year_frames('./WDIData.csv')
    for year in response:
        response[year] = response[year].to_json()
    return jsonify(response)

@app.route('/mds_frames', methods = ['GET'])
def get_mds_plot_Data():
    return jsonify(get_mds_data('./WDIData.csv'))

@app.route('/pca_frames', methods = ['GET'])
def get_pca_plot_Data():
    return jsonify(get_pca_frames('./WDIData.csv'))

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug = True)