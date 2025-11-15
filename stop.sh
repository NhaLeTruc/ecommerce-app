#!/bin/bash

# Ecommerce Platform Shutdown Script
# This script stops all microservices

set -e

echo "=================================="
echo "Ecommerce Platform - Shutdown"
echo "=================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
REMOVE_VOLUMES=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--volumes)
            REMOVE_VOLUMES=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: ./stop.sh [-v|--volumes]"
            echo "  -v, --volumes    Remove volumes (deletes all data)"
            exit 1
            ;;
    esac
done

if [ "$REMOVE_VOLUMES" = true ]; then
    echo -e "${YELLOW}Stopping services and removing volumes...${NC}"
    echo -e "${RED}WARNING: This will delete all data!${NC}"
    echo ""
    read -p "Are you sure? (yes/no) " -n 3 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo "Cancelled"
        exit 0
    fi
    docker-compose down -v
    echo ""
    echo -e "${GREEN}Services stopped and data removed${NC}"
else
    echo -e "${YELLOW}Stopping services...${NC}"
    docker-compose down
    echo ""
    echo -e "${GREEN}Services stopped (data preserved)${NC}"
fi

echo ""
echo "=================================="
echo -e "${BLUE}Platform Stopped${NC}"
echo "=================================="
echo ""

if [ "$REMOVE_VOLUMES" = false ]; then
    echo "Data volumes preserved."
    echo "To remove all data, run: ./stop.sh --volumes"
    echo ""
fi

echo "To start again, run: ./start.sh"
echo ""
