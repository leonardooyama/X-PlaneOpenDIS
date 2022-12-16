TEMPLATE = lib

QT += core network

#CONFIG += warn_on plugin release
#CONFIG -= thread exceptions qt rtti debug

CONFIG += warn_off plugin
CONFIG -= thread exceptions rtti gui


INCLUDEPATH += ../XPLMSDK/CHeaders/XPLM
INCLUDEPATH += ../XPLMSDK/CHeaders/Wrappers
INCLUDEPATH += ../XPLMSDK/CHeaders/Widgets


DEFINES += XPLM200
DEFINES += XPLM210
DEFINES += XPLM300

win32 {
    DEFINES += APL=0 IBM=1 LIN=0
    LIBS += -L../XPLMSDK/Libraries/Win
    LIBS += -lXPLM_64 -lXPWidgets_64
    TARGET = OpenDIS_XPlane
    TARGET_EXT = .xpl
    TARGET_CUSTOM_EXT = .xpl
    PLUGIN_FINAL_DIR = $$shell_quote($$shell_path("C:/X-Plane 11/Resources/plugins/OpenDIS_XPlane/win_x64"))
}

INCLUDEPATH += $$PWD/../DIS
DEPENDPATH += $$PWD/../DIS
win32:CONFIG(release, debug|release): LIBS += -L$$PWD/../DIS/bin_release/ -lOpenDIS6
else:win32:CONFIG(debug, debug|release): LIBS += -L$$PWD/../DIS/bin_debug/ -lOpenDIS6

INCLUDEPATH += $$PWD/../geographiclib/x64-windows/include
DEPENDPATH += $$PWD/../geographiclib/x64-windows/include
win32:CONFIG(release, debug|release): LIBS += -L$$PWD/../geographiclib/x64-windows/lib/ -lGeographicLib-i
else:win32:CONFIG(debug, debug|release): LIBS += -L$$PWD/../geographiclib/x64-windows/debug/lib/ -lGeographicLib_d-i

SOURCES += \
    plugin.cpp

win32 {
    DEPLOY_COMMAND = $$[QT_INSTALL_BINS]/windeployqt
}
macx {
    DEPLOY_COMMAND = $$[QT_INSTALL_BINS]/macdeployqt
}

CONFIG( debug, debug|release ) {
    # debug
    DEPLOY_FOLDER = $$shell_quote($$shell_path($${OUT_PWD}/debug))
    DEPLOY_TARGET = $$shell_quote($$shell_path($${OUT_PWD}/debug/$${TARGET}$${TARGET_CUSTOM_EXT}))
    DIS_BIN = $$shell_path("../DIS/bin_debug/")
    GEOGRAPHICLIB_BIN = $$shell_path("../geographiclib/x64-windows/debug/bin")
} else {
    # release
    DEPLOY_FOLDER = $$shell_quote($$shell_path($${OUT_PWD}/release))
    DEPLOY_TARGET = $$shell_quote($$shell_path($${OUT_PWD}/release/$${TARGET}$${TARGET_CUSTOM_EXT}))
    DIS_BIN = $$shell_path("../DIS/bin_release/")
    GEOGRAPHICLIB_BIN = $$shell_path("../geographiclib/x64-windows/bin")
}

QMAKE_POST_LINK = $${DEPLOY_COMMAND} $${DEPLOY_TARGET} --no-translations $$escape_expand(\n\t)

win32 {
    QMAKE_POST_LINK += copy $${DIS_BIN}\*.dll $${DEPLOY_FOLDER} $$escape_expand(\n\t)
    QMAKE_POST_LINK += copy $${GEOGRAPHICLIB_BIN}\*.dll $${DEPLOY_FOLDER} $$escape_expand(\n\t)
    QMAKE_POST_LINK += if exist $${PLUGIN_FINAL_DIR} del /S/Q $${PLUGIN_FINAL_DIR}  $$escape_expand(\n\t)
    QMAKE_POST_LINK += xcopy $${DEPLOY_FOLDER} $${PLUGIN_FINAL_DIR}\ /E/C $$escape_expand(\n\t)
    QMAKE_POST_LINK += del /S/Q $${PLUGIN_FINAL_DIR}\*.exp  $$escape_expand(\n\t)
    QMAKE_POST_LINK += del /S/Q $${PLUGIN_FINAL_DIR}\*.ilk  $$escape_expand(\n\t)
    QMAKE_POST_LINK += del /S/Q $${PLUGIN_FINAL_DIR}\*.lib  $$escape_expand(\n\t)
    QMAKE_POST_LINK += del /S/Q $${PLUGIN_FINAL_DIR}\*.pdb  $$escape_expand(\n\t)
    QMAKE_POST_LINK += del /S/Q $${PLUGIN_FINAL_DIR}\*.obj  $$escape_expand(\n\t)
}
