// autor: Leonardo Seiji Oyama
// contato: leonardooyama@gmail.com

#define PI 3.1415926535897932384626433832795

//XPLM
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

//Widgets
#include "XPStandardWidgets.h"
#include "XPUIGraphics.h"
#include "XPWidgetDefs.h"
#include "XPWidgets.h"
#include "XPWidgetUtils.h"

//Wrappers
#include "XPCBroadcaster.h"
#include "XPCDisplay.h"
#include "XPCListener.h"
#include "XPCProcessing.h"
#include "XPCWidget.h"
#include "XPCWidgetAttachments.h"

#if IBM
#include <windows.h>
#endif

#include <QUdpSocket>
#include <QDateTime>
#include <QNetworkDatagram>
#include <QString>

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

XPLMDataRef DataRefFlightModelLat;
XPLMDataRef DataRefFlightModelLon;
XPLMDataRef DataRefFlightModelElev;
XPLMDataRef DataRefFlightModelTrueTheta;
XPLMDataRef DataRefFlightModelTruePhi;
XPLMDataRef DataRefFlightModelTruePsi;
XPLMDataRef DataRefFlightModelMagPsi;
XPLMDataRef DataRefFlightModelLocalVx;
XPLMDataRef DataRefFlightModelLocalVy;
XPLMDataRef DataRefFlightModelLocalVz;
XPLMDataRef DataRefFlightModelLocalAx;
XPLMDataRef DataRefFlightModelLocalAy;
XPLMDataRef DataRefFlightModelLocalAz;

double flightModelLat, flightModelLon, flightModelElev;
float flightModelTrueTheta, flightModelTruePhi, flightModelTruePsi, flightModelMagPsi;
float flightModelLocalVx, flightModelLocalVy, flightModelLocalVz;
float flightModelLocalAx, flightModelLocalAy, flightModelLocalAz;

double geocentricX, geocentricY, geocentricZ;

float FlightLoopSendUDPDatagram(float inElapsedSinceLastCall, float inElapsedTimeSinceLastFlightLoop, int inCounter, void *inRefcon);


XPLMWindowID	gWindow = NULL;

QUdpSocket socketUDP;

void MyDrawWindowCallback(
        XPLMWindowID         inWindowID,
        void *               inRefcon);

void MyHandleKeyCallback(
        XPLMWindowID         inWindowID,
        char                 inKey,
        XPLMKeyFlags         inFlags,
        char                 inVirtualKey,
        void *               inRefcon,
        int                  losingFocus);

int MyHandleMouseClickCallback(
        XPLMWindowID         inWindowID,
        int                  x,
        int                  y,
        XPLMMouseStatus      inMouse,
        void *               inRefcon);

PLUGIN_API int XPluginStart(
        char *	outName,
        char *	outSig,
        char *	outDesc)
{
    strcpy(outName, "OpenDIS-XPlane");
    strcpy(outSig, "coter.OpenDIS-XPlane");
    strcpy(outDesc, "A plugin that implements some of the Open DIS functionalities in X-Plane.");

    XPLMRegisterFlightLoopCallback(FlightLoopSendUDPDatagram, xplm_FlightLoop_Phase_AfterFlightModel, NULL);

    DataRefFlightModelLat = XPLMFindDataRef("sim/flightmodel/position/latitude");
    DataRefFlightModelLon = XPLMFindDataRef("sim/flightmodel/position/longitude");
    DataRefFlightModelElev = XPLMFindDataRef("sim/flightmodel/position/elevation");
    DataRefFlightModelTrueTheta = XPLMFindDataRef("sim/flightmodel/position/true_theta");
    DataRefFlightModelTruePhi = XPLMFindDataRef("sim/flightmodel/position/true_phi");
    DataRefFlightModelTruePsi = XPLMFindDataRef("sim/flightmodel/position/true_psi");
    DataRefFlightModelMagPsi = XPLMFindDataRef("sim/flightmodel/position/mag_psi");
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
    // atualiza variaveis com os dados do modelo de voo
    flightModelLat = XPLMGetDatad(DataRefFlightModelLat);
    flightModelLon = XPLMGetDatad(DataRefFlightModelLon);
    flightModelElev = XPLMGetDatad(DataRefFlightModelElev);

    flightModelTrueTheta = XPLMGetDataf(DataRefFlightModelTrueTheta);
    flightModelTruePhi = XPLMGetDataf(DataRefFlightModelTruePhi);
    flightModelTruePsi = XPLMGetDataf(DataRefFlightModelTruePsi);
    flightModelMagPsi = XPLMGetDataf(DataRefFlightModelMagPsi);

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
    orientation.setPhi(flightModelTruePhi);
    orientation.setPsi(flightModelTruePsi);
    orientation.setTheta(flightModelTrueTheta);
    friendly.setEntityOrientation(orientation);

    // Entity linear speed
    DIS::Vector3Float linearVelocity;
//    double velLat = 0, velLon = 0, velElev = 0, velX = 0, velY = 0, velZ =0;
//    XPLMLocalToWorld(flightModelLocalVx, flightModelLocalVy, flightModelLocalVz, &velLat, &velLon, &velElev);
//    earth.Forward(velLat, velLon, velElev, velX, velY, velZ);
    linearVelocity.setX(flightModelLocalVx);
    linearVelocity.setY(flightModelLocalVy);
    linearVelocity.setZ(flightModelLocalVz);
    friendly.setEntityLinearVelocity(linearVelocity);

    // Dead Reckoning
    DIS::DeadReckoningParameter drp;
    drp.setDeadReckoningAlgorithm(DRM_FVW);

    // Entity acceleration
    DIS::Vector3Float acceleration;
//    double accLat = 0, accLon = 0, accElev = 0, accX = 0, accY = 0, accZ = 0;
//    XPLMLocalToWorld(flightModelLocalAx, flightModelLocalAy, flightModelLocalAz, &accLat, &accLon, &accElev);
//    earth.Forward(accLat, accLon, accElev, accX, accY, accZ);
    acceleration.setX(flightModelLocalAx);
    acceleration.setY(flightModelLocalAy);
    acceleration.setZ(flightModelLocalAz);
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

    // return in 10 flight loops
    return -10.0;
}
