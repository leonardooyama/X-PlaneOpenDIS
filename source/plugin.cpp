// author: Leonardo Seiji Oyama
// contact: leonardooyama@gmail.com

// old definition of Pi constant
#define PI 3.1415926535897932384626433832795

//XPLM libs
#include "XPLMCamera.h"
#include "XPLMDataAccess.h"
#include "XPLMDefs.h"
#include "XPLMDisplay.h"
#include "XPLMGraphics.h"
#include "XPLMMenus.h"
#include "XPLMNavigation.h"
#include "XPLMPlanes.h"
#include "XPLMPlugin.h"
#include "XPLMProcessing.h"
#include "XPLMScenery.h"
#include "XPLMUtilities.h"

//Widgets libs
#include "XPStandardWidgets.h"
#include "XPUIGraphics.h"
#include "XPWidgetDefs.h"
#include "XPWidgets.h"
#include "XPWidgetUtils.h"

//Wrappers libs
#include "XPCBroadcaster.h"
#include "XPCDisplay.h"
#include "XPCListener.h"
#include "XPCProcessing.h"
#include "XPCWidget.h"
#include "XPCWidgetAttachments.h"

#if IBM
#include <windows.h>
#endif

// Qt libs
#include <QUdpSocket>
#include <QDateTime>
#include <QNetworkDatagram>
#include <QString>
#include <QVector3D>

// Open DIS lib
#include <utils/DataStream.h>
#include <utils/Conversion.h>
#include <dis6/EntityStatePdu.h>
#include <dis6/EntityStatePdu.h>
#include <dis6/DetonationPdu.h>
#include <dis6/Vector3Double.h>
#include <dis6/BurstDescriptor.h>

// GeographicLib
#include <GeographicLib/Geocentric.hpp>

// enums to feed the Dead reckoning DIS function
enum DeadReckoningModel
{
    STATIC = 1,
    DRM_FPW,
    DRM_RPW,
    DRM_RVW,
    DRM_FVW,
    DRM_FPB,
    DRM_RPB,
    DRM_RVB,
    DRM_FVB,
};

// variables to read data from X-Plane
XPLMDataRef DataRefFlightModelLat;
XPLMDataRef DataRefFlightModelLon;
XPLMDataRef DataRefFlightModelElev;
XPLMDataRef DataRefFlightModelTheta; // rotation around the Y axis
XPLMDataRef DataRefFlightModelPhi; // rotation around the X axis
XPLMDataRef DataRefFlightModelPsi; // rotation around Z axis
XPLMDataRef DataRefFlightModelTrueTheta;
XPLMDataRef DataRefFlightModelTruePhi;
XPLMDataRef DataRefFlightModelTruePsi;
XPLMDataRef DataRefFlightModelMag_Psi;
XPLMDataRef DataRefFlightModelLocalVx;
XPLMDataRef DataRefFlightModelLocalVy;
XPLMDataRef DataRefFlightModelLocalVz;
XPLMDataRef DataRefFlightModelLocalAx;
XPLMDataRef DataRefFlightModelLocalAy;
XPLMDataRef DataRefFlightModelLocalAz;

// variables to build Entity State PDUs
double flightModelLat, flightModelLon, flightModelElev;
float flightModelTheta, flightModelPhi, flightModelPsi;
float flightModelTheta_rad, flightModelPhi_rad, flightModelPsi_rad;
float flightModelTrueTheta, flightModelTruePhi, flightModelTruePsi, flightModelMag_Psi;
float flightModelLocalVx, flightModelLocalVy, flightModelLocalVz;
float flightModelLocalAx, flightModelLocalAy, flightModelLocalAz;
double geocentricX, geocentricY, geocentricZ;


// variables to build the conversion matrix from X-Plane OGL coordinate system to Geocentric coordinate system
double latOGLX, lonOGLX, elevOGLX, latOGLY, lonOGLY, elevOGLY, latOGLZ, lonOGLZ, elevOGLZ;
double latOGL_zero, lonOGL_zero, elevOGL_zero;
double latOGL_zero_old, lonOGL_zero_old, elevOGL_zero_old;
double geocentricOGL_zeroX, geocentricOGL_zeroY, geocentricOGL_zeroZ;
double geocentricOGLXX, geocentricOGLXY, geocentricOGLXZ, geocentricOGLYX, geocentricOGLYY, geocentricOGLYZ, geocentricOGLZX, geocentricOGLZY, geocentricOGLZZ;

// function to update the conversion matrix from X-Plane OGL coordinate system to Geocentric coordinate system
void UpdateCanonicConversionVectors();
// function to convert 3D vector from X-Plane OGL coordinate system to Geocentric coordinate system
QVector<double> ConvertOGL2Geocentric(QVector<double> OGLVector);

void DebugToXPlaneLog(QString debugString);

std::string pluginName = "OpenDIS-XPlane";
std::string pluginSignature = "coter.OpenDIS-XPlane";
std::string pluginDescription = "A plugin that implements some of the Open DIS functionalities in X-Plane.";

QUdpSocket socketUDP; // UDP socket for sending data over the network

// flight loop callback to send DIS PDUs
float FlightLoopSendUDPDatagram(float inElapsedSinceLastCall, float inElapsedTimeSinceLastFlightLoop, int inCounter, void *inRefcon);

// window id to interface inside X-Plane, not used yet
XPLMWindowID	gWindow = NULL;

// function to handle window interface inside X-Plane, not used yet
void MyDrawWindowCallback(XPLMWindowID inWindowID, void *inRefcon);
// function to handle keybord interactions inside X-Plane, not used yet
void MyHandleKeyCallback(XPLMWindowID inWindowID, char inKey, XPLMKeyFlags inFlags, char inVirtualKey, void * inRefcon, int losingFocus);
// function to handle mouse interactions inside X-Plane, not used yet
int MyHandleMouseClickCallback(XPLMWindowID inWindowID, int x, int y, XPLMMouseStatus inMouse, void * inRefcon);

PLUGIN_API int XPluginStart(char *	outName, char *	outSig, char *	outDesc)
{
    strcpy_s(outName, pluginName.size() + 1 , pluginName.c_str());
    strcpy_s(outSig, pluginSignature.size() + 1, pluginSignature.c_str());
    strcpy_s(outDesc, pluginDescription.size() + 1, pluginDescription.c_str());

    XPLMRegisterFlightLoopCallback(FlightLoopSendUDPDatagram, xplm_FlightLoop_Phase_AfterFlightModel, NULL);

    DataRefFlightModelLat = XPLMFindDataRef("sim/flightmodel/position/latitude");
    DataRefFlightModelLon = XPLMFindDataRef("sim/flightmodel/position/longitude");
    DataRefFlightModelElev = XPLMFindDataRef("sim/flightmodel/position/elevation");
    DataRefFlightModelTrueTheta = XPLMFindDataRef("sim/flightmodel/position/true_theta");
    DataRefFlightModelTruePhi = XPLMFindDataRef("sim/flightmodel/position/true_phi");
    DataRefFlightModelTruePsi = XPLMFindDataRef("sim/flightmodel/position/true_psi");
    DataRefFlightModelTheta = XPLMFindDataRef("sim/flightmodel/position/theta");
    DataRefFlightModelPhi = XPLMFindDataRef("sim/flightmodel/position/phi");
    DataRefFlightModelPsi = XPLMFindDataRef("sim/flightmodel/position/psi");
    DataRefFlightModelMag_Psi = XPLMFindDataRef("sim/flightmodel/position/mag_psi");
    DataRefFlightModelLocalVx = XPLMFindDataRef("sim/flightmodel/position/local_vx");
    DataRefFlightModelLocalVy = XPLMFindDataRef("sim/flightmodel/position/local_vy");
    DataRefFlightModelLocalVz = XPLMFindDataRef("sim/flightmodel/position/local_vz");
    DataRefFlightModelLocalAx = XPLMFindDataRef("sim/flightmodel/position/local_ax");
    DataRefFlightModelLocalAy = XPLMFindDataRef("sim/flightmodel/position/local_ay");
    DataRefFlightModelLocalAz = XPLMFindDataRef("sim/flightmodel/position/local_az");
    return 1;
}


PLUGIN_API void	XPluginStop(void)
{

}

PLUGIN_API void XPluginDisable(void)
{
}

PLUGIN_API int XPluginEnable(void)
{
    return 1;
}

PLUGIN_API void XPluginReceiveMessage(
        XPLMPluginID	inFromWho,
        long			inMessage,
        void *			inParam)
{
}

float FlightLoopSendUDPDatagram(float inElapsedSinceLastCall, float inElapsedTimeSinceLastFlightLoop, int inCounter, void *inRefcon)
{
    UpdateCanonicConversionVectors();

    // update flight model variables with current data
    flightModelLat = XPLMGetDatad(DataRefFlightModelLat);
    flightModelLon = XPLMGetDatad(DataRefFlightModelLon);
    flightModelElev = XPLMGetDatad(DataRefFlightModelElev);

    flightModelTheta = XPLMGetDataf(DataRefFlightModelTheta);
    flightModelPhi = XPLMGetDataf(DataRefFlightModelPhi);
    flightModelPsi = XPLMGetDataf(DataRefFlightModelPsi);
    flightModelTheta_rad = (2 * PI * flightModelTheta) / 360; // convert from degree to rad
    flightModelPhi_rad = (2 * PI * flightModelPhi) / 360; // convert from degree to rad
    flightModelPsi_rad = (2 * PI * flightModelPsi) / 360; // convert from degree to rad

    flightModelTrueTheta = XPLMGetDataf(DataRefFlightModelTrueTheta);
    flightModelTruePhi = XPLMGetDataf(DataRefFlightModelTruePhi);
    flightModelTruePsi = XPLMGetDataf(DataRefFlightModelTruePsi);
    flightModelMag_Psi = XPLMGetDataf(DataRefFlightModelMag_Psi);

    flightModelLocalVx = XPLMGetDataf(DataRefFlightModelLocalVx);
    flightModelLocalVy = XPLMGetDataf(DataRefFlightModelLocalVy);
    flightModelLocalVz = XPLMGetDataf(DataRefFlightModelLocalVz);

    flightModelLocalAx = XPLMGetDataf(DataRefFlightModelLocalAx);
    flightModelLocalAy = XPLMGetDataf(DataRefFlightModelLocalAy);
    flightModelLocalAz = XPLMGetDataf(DataRefFlightModelLocalAz);

    // DIS code to create entity state PDU
    DIS::DataStream buffer(DIS::BIG);
    DIS::EntityStatePdu friendly;
    friendly.setProtocolVersion(6);

    // Exercise Id
    friendly.setExerciseID(1);

    // Entity Id
    DIS::EntityID friendlyID;
    friendlyID.setEntity(1);
    friendlyID.setSite(21340);
    friendlyID.setApplication(22026);
    friendly.setEntityID(friendlyID);

    // Entity Type: an AH-1W
    DIS::EntityType ah_1w;
    ah_1w.setCategory(20);
    ah_1w.setCountry(225);
    ah_1w.setDomain(2);
    ah_1w.setEntityKind(1);
    ah_1w.setExtra(0);
    ah_1w.setSpecific(10);
    ah_1w.setSubcategory(2);
    friendly.setEntityType(ah_1w);
    friendly.setAlternativeEntityType(ah_1w);

    // Entity Force id
    friendly.setForceId(1);

    // transform geographic coordinates (Lat Lon Elev) into geocentric coordinates (X Y Z)
    GeographicLib::Geocentric earth(GeographicLib::Constants::WGS84_a(), GeographicLib::Constants::WGS84_f());
    earth.Forward(flightModelLat, flightModelLon, flightModelElev, geocentricX, geocentricY, geocentricZ);

    // Entity Location
    DIS::Vector3Double position;
    position.setX(geocentricX);
    position.setY(geocentricY);
    position.setZ(geocentricZ);
    friendly.setEntityLocation(position);

    // Entity Orientation
    DIS::Orientation orientation;
    QVector<double> orientation_OGL, orientation_Geocentric;
    orientation_OGL.push_back(flightModelPhi_rad); // rotation around X-Axis
    orientation_OGL.push_back(flightModelTheta_rad); // rotation around Y-Axis
    orientation_OGL.push_back(flightModelPsi_rad); // // rotation around Z-Axis
    orientation_Geocentric  = ConvertOGL2Geocentric(orientation_OGL);
    orientation.setPhi(orientation_Geocentric[0]);
    orientation.setTheta(orientation_Geocentric[1]);
    orientation.setPsi(orientation_Geocentric[2]);
    friendly.setEntityOrientation(orientation);

    // Entity linear speed
    DIS::Vector3Float linearVelocity;
    QVector<double> linVel_OGL, linVel_Geocentric;
    linVel_OGL.push_back(flightModelLocalVx);
    linVel_OGL.push_back(flightModelLocalVy);
    linVel_OGL.push_back(flightModelLocalVz);
    linVel_Geocentric  = ConvertOGL2Geocentric(linVel_OGL);
    linearVelocity.setX(linVel_Geocentric[0]);
    linearVelocity.setY(linVel_Geocentric[1]);
    linearVelocity.setZ(linVel_Geocentric[2]);

    friendly.setEntityLinearVelocity(linearVelocity);

    // Dead Reckoning
    DIS::DeadReckoningParameter drp;
    drp.setDeadReckoningAlgorithm(DRM_FVW);

    // Entity acceleration
    DIS::Vector3Float acceleration;
    QVector<double> accel_OLG, accel_Geocentric;
    accel_OLG.push_back(flightModelLocalAx);
    accel_OLG.push_back(flightModelLocalAy);
    accel_OLG.push_back(flightModelLocalAz);
    accel_Geocentric = ConvertOGL2Geocentric(accel_OLG);
    acceleration.setX(accel_Geocentric[0]);
    acceleration.setY(accel_Geocentric[1]);
    acceleration.setZ(accel_Geocentric[2]);
    drp.setEntityLinearAcceleration(acceleration);
    friendly.setDeadReckoningParameters(drp);

    // Save Entity information to buffer
    friendly.setLength(friendly.getMarshalledSize());
    friendly.marshal(buffer);

    // Save buffer to QByteArray, then send it over the UDP socket
    QByteArray dataToSend(&buffer[0] , buffer.size());
    socketUDP.writeDatagram(dataToSend, QHostAddress::Broadcast, 3000);

    // clear the memory
    dataToSend.clear();
    buffer.clear();

    //return -10.0; // return in 10 flight loops

    return 1.0; // return in 1 second, will send 1 PDU per second
}

void UpdateCanonicConversionVectors()
{
    latOGL_zero_old = latOGL_zero;
    lonOGL_zero_old = lonOGL_zero;
    elevOGL_zero_old = elevOGL_zero;
    XPLMLocalToWorld(0,0,0, &latOGL_zero, &lonOGL_zero, &elevOGL_zero);
    if (latOGL_zero == latOGL_zero_old && lonOGL_zero == lonOGL_zero_old && elevOGL_zero == elevOGL_zero_old)
    {
        QString debugStr;
        debugStr = "The origin of the OGL coordinates has not changed. Update is not necessary.";
        DebugToXPlaneLog(debugStr);
        return;
    }
    XPLMLocalToWorld(1,0,0, &latOGLX, &lonOGLX, &elevOGLX);
    XPLMLocalToWorld(0,1,0, &latOGLY, &lonOGLY, &elevOGLY);
    XPLMLocalToWorld(0,0,1, &latOGLZ, &lonOGLZ, &elevOGLZ);

    GeographicLib::Geocentric earth(GeographicLib::Constants::WGS84_a(), GeographicLib::Constants::WGS84_f());
    earth.Forward(latOGL_zero, lonOGL_zero, elevOGL_zero, geocentricOGL_zeroX, geocentricOGL_zeroY, geocentricOGL_zeroZ);
    earth.Forward(latOGLX, lonOGLX, elevOGLX, geocentricOGLXX, geocentricOGLXY, geocentricOGLXZ);
    earth.Forward(latOGLY, lonOGLY, elevOGLY, geocentricOGLYX, geocentricOGLYY, geocentricOGLYZ);
    earth.Forward(latOGLZ, lonOGLZ, elevOGLZ, geocentricOGLZX, geocentricOGLZY, geocentricOGLZZ);
    geocentricOGLXX = geocentricOGLXX - geocentricOGL_zeroX;
    geocentricOGLXY = geocentricOGLXY - geocentricOGL_zeroY;
    geocentricOGLXZ = geocentricOGLXZ - geocentricOGL_zeroZ;
    geocentricOGLYX = geocentricOGLYX - geocentricOGL_zeroX;
    geocentricOGLYY = geocentricOGLYY - geocentricOGL_zeroY;
    geocentricOGLYZ = geocentricOGLYZ - geocentricOGL_zeroZ;
    geocentricOGLZX = geocentricOGLZX - geocentricOGL_zeroX;
    geocentricOGLZY = geocentricOGLZY - geocentricOGL_zeroY;
    geocentricOGLZZ = geocentricOGLZZ - geocentricOGL_zeroZ;

    QString debugStr;
    debugStr = "\nmatrix = \n";
    debugStr+= QString::number(geocentricOGLXX, 'f', 6) + " ";
    debugStr+= QString::number(geocentricOGLXY, 'f', 6) + " ";
    debugStr+= QString::number(geocentricOGLXZ, 'f', 6) + "\n";
    debugStr+= QString::number(geocentricOGLYX, 'f', 6) + " ";
    debugStr+= QString::number(geocentricOGLYY, 'f', 6) + " ";
    debugStr+= QString::number(geocentricOGLYZ, 'f', 6) + "\n";
    debugStr+= QString::number(geocentricOGLZX, 'f', 6) + " ";
    debugStr+= QString::number(geocentricOGLZY, 'f', 6) + " ";
    debugStr+= QString::number(geocentricOGLZZ, 'f', 6) + "\n";
    DebugToXPlaneLog(debugStr);
}

QVector<double> ConvertOGL2Geocentric(QVector<double> OGLVector)
{
    QVector<double> converted;
    double x ,y, z;
    if (OGLVector.size() !=3)
    {
        x = -1;
        y = -1;
        z = -1;
        converted.push_back(x);
        converted.push_back(y);
        converted.push_back(z);
        return converted;
    }
    x = OGLVector[0]* geocentricOGLXX + OGLVector[1]* geocentricOGLXY + OGLVector[2]* geocentricOGLXZ;
    y = OGLVector[0]* geocentricOGLYX + OGLVector[1]* geocentricOGLYY + OGLVector[2]* geocentricOGLYZ;
    z = OGLVector[0]* geocentricOGLZX + OGLVector[1]* geocentricOGLZY + OGLVector[2]* geocentricOGLZZ;
    converted.push_back(x);
    converted.push_back(y);
    converted.push_back(z);
    return converted;
}

void DebugToXPlaneLog(QString debugString)
{
    QString dbg;
    dbg = QDateTime::currentDateTime().toString("dd-MM-yyyy, hh'h' mm'min' ss's': ");
    dbg+= "[" + QString::fromStdString(pluginSignature) + "]: ";
    dbg+= debugString + "\n";
    XPLMDebugString(dbg.toStdString().c_str());
}
