cmake_minimum_required(VERSION 3.20)

project(SiteInfoEditor LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)

find_package(Qt6 REQUIRED COMPONENTS Widgets)

qt_add_executable(site_info_editor
  main.cpp
)

target_link_libraries(site_info_editor PRIVATE Qt6::Widgets)

# External libraries can be added here later, for example:
# find_package(nlohmann_json CONFIG REQUIRED)
# target_link_libraries(site_info_editor PRIVATE nlohmann_json::nlohmann_json)
