// Parolo Federico & Nicolo' Scarabello

#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <ArduinoJson.h>
#include "Adafruit_TSL2591.h"
#define ADDRESS 0x38
#define START_MEASURE 0xAC
#define GET_STATUS_BYTE 0x71


Adafruit_TSL2591 tsl = Adafruit_TSL2591(2591);
JsonDocument doc;

void configureLightSensor(void)
{
  tsl.setGain(TSL2591_GAIN_MED);      // 25x gain
  // multiplier for light intake
  tsl.setTiming(TSL2591_INTEGRATIONTIME_300MS);
  // time of the sample of light for sensor
}

long parseTemperature(byte* measure) {
  long temp = measure[2] & 0x0f;
  temp = temp << 8;
  temp |= measure[3];
  temp = temp << 8;
  temp |= measure[4];
  return temp;
}

long parseHumidity(byte* measure) {
  long humidity = measure[0];
  humidity = humidity << 8;
  humidity |= measure[1];
  humidity = humidity << 4;
  humidity |= measure[2] >> 4;
  return humidity;
}

void dht20RequestMeasure(byte* m) {
  delay(50);
  Wire.beginTransmission(ADDRESS);
  Wire.write(START_MEASURE); // command to start measure with 2 bytes as options
  Wire.write(0x33);
  Wire.write(0x00);
  Wire.endTransmission();
  delay(100); // delay for measurement to be completed (80ms min.)


  Wire.requestFrom(ADDRESS, 7); // request 7 bytes from sensor (1 control, 5 measure, 1 CRC)
  while (Wire.available() < 7);

  byte status = Wire.read();

  if (status & (1 << 7) != 1) { // check if measurement complete
  Serial.println("Problema con misura dht20");
    dht20RequestMeasure(m);
  } else {
    // Serial.println("Misurando dht20");
    for (int i = 0; i < 6; i++) {
      m[i] = Wire.read();
    }
  }
}

void setup() {
  // put your setup code here, to run once:
  Serial.begin(9600);

  Wire.begin();
  
  delay(200); // wait for power-on of sensors

  // searches for a TSL2591 sensor connected
  if (tsl.begin()) {
    //Serial.println("TSL2591 found");
    configureLightSensor();
  } else {
    Serial.println("No TSL2591 found");
  }

}



void loop() {
  // put your main code here, to run repeatedly:

  delay(1000);


  // status byte for dht20
  Wire.requestFrom(ADDRESS, 1);
  while (Wire.available() < 1);
  byte status = 0;
  status = Wire.read();
  //Serial.println(status, BIN);
  if (status & 0x18 != 0x18) {
    Serial.println("DHT20 non inizializzato correttamente");
  } else {
    //Serial.println("OK");
    byte measure[6];
    dht20RequestMeasure(measure);

    // conversion for humidity and temperature
    long humidity = parseHumidity(measure);

    //Serial.print("Humidity: ");
    //Serial.println( humidity, BIN);

    long temp = parseTemperature(measure);

    //Serial.print("Temperature: ");
    //Serial.println(temp, BIN);

    double finalHumidity = (humidity/(pow(2,20))*100); // (100%)
    double finalTemp = (temp/pow(2,20))*200 - 50;

    // troncamento dei dati al secondo decimale
    // risoluzione dht20 0.01 °C e 0.024 %HR (arrotondamento al centesimo per praticità)
    // risoluzione 
    finalHumidity = floor(finalHumidity*100)/100;
    finalTemp = floor(finalTemp*100)/100; 

    // luminosity measure from tsl2591
    
    // 
    sensors_event_t event;
    tsl.getEvent(&event);
    float lum = event.light;

    // json building
    doc["temperature"] = finalTemp;
    doc["humidity"] = finalHumidity; 
    doc["luminosity"] = lum;


    serializeJson(doc,Serial); // serializzazione dell'oggetto e stampa a terminale seriale
    Serial.println("");
  
  }

  delay(1000); // delay from measure to measure
}


