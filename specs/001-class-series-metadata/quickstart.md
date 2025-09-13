# Quickstart: Class Series Metadata

This quickstart guide will walk you through the process of creating and managing class series.

## 1. Create a Class Series

First, create a new class series by sending a POST request to the `/api/class-series` endpoint. This will create a new blueprint for a recurring class.

## 2. Extend the Class Series

Next, extend the class series by sending a POST request to the `/api/class-series/{seriesId}/extend` endpoint. This will generate the individual class sessions for the series.

## 3. View the Class Series

View the class series by sending a GET request to the `/api/class-series/{seriesId}` endpoint. This will return the details of the series blueprint.

## 4. Update the Class Series

Update the class series by sending a PATCH request to the `/api/class-series/{seriesId}` endpoint. This will update the series blueprint and propagate the changes to all future, un-cancelled class sessions.

## 5. View the Summary

View a summary of the class series for a student by sending a GET request to the `/api/class-series/summary` endpoint. This will return the total number of regular classes and a breakdown by subject.
