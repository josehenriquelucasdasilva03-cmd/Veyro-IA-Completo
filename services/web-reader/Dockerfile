FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/browsers
RUN pip install --no-cache-dir -r requirements.txt && playwright install --with-deps chromium
COPY server.py .
RUN useradd --create-home reader
RUN chmod -R a+rX /opt/browsers
USER reader
EXPOSE 8080
CMD ["python", "server.py"]
