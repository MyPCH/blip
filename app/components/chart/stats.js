import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import bows from 'bows';

import { utils as vizUtils, components as vizComponents } from '@tidepool/viz';

const { Stat } = vizComponents;
const { commonStats, getStatData, getStatDefinition } = vizUtils.stat;
const { reshapeBgClassesToBgBounds } = vizUtils.bg;
const { isAutomatedBasalDevice: isAutomatedBasalDeviceCheck } = vizUtils.device;

class Stats extends Component {
  static propTypes = {
    bgPrefs: PropTypes.object.isRequired,
    chartPrefs: PropTypes.object,
    chartType: PropTypes.oneOf(['basics', 'daily', 'weekly', 'trends']).isRequired,
    dataUtil: PropTypes.object.isRequired,
    endpoints: PropTypes.arrayOf(PropTypes.string),
  };

  constructor(props) {
    super(props);
    this.log = bows('Stats');

    this.bgPrefs = {
      bgUnits: this.props.bgPrefs.bgUnits,
      bgBounds: reshapeBgClassesToBgBounds(this.props.bgPrefs),
    };

    this.dataFetchMethods = {
      [commonStats.averageBg]: 'getAverageBgData',
      [commonStats.averageDailyCarbs]: 'getAverageDailyCarbsData',
      [commonStats.coefficientOfVariation]: 'getCoefficientOfVariationData',
      [commonStats.glucoseManagementIndex]: 'getGlucoseManagementIndexData',
      [commonStats.readingsInRange]: 'getReadingsInRangeData',
      [commonStats.standardDev]: 'getStandardDevData',
      [commonStats.timeInAuto]: 'getTimeInAutoData',
      [commonStats.timeInRange]: 'getTimeInRangeData',
      [commonStats.totalInsulin]: 'getTotalInsulinData',
    }

    this.updateDataUtilEndpoints(this.props);

    this.state = {
      stats: this.getStatsByChartType(this.props),
    };
  }

  componentWillReceiveProps = nextProps => {
    const update = this.updateRequired(nextProps);
    console.log('update', update);
    if (update) {
      this.updateDataUtilEndpoints(nextProps);
      if (update.full) {
        this.setState({
          stats: this.getStatsByChartType(nextProps)
        });
      } else if (update.data) {
        // this.updateDataUtilEndpoints(nextProps);
        this.updateStats(nextProps);
      }
    }
  };

  shouldComponentUpdate = nextProps => {
    return this.updateRequired(nextProps);
  };

  updateRequired = nextProps => {
    const {
      bgSource,
      // dataUtil: { bgSource },
      // chartPrefs,
      endpoints,
    } = nextProps;

    const endpointsChanged = endpoints && !_.isEqual(endpoints, this.props.endpoints);
    // const chartPrefsChanged = chartPrefs && !_.isEqual(chartPrefs, this.props.chartPrefs);
    const bgSourceChanged = bgSource && !_.isEqual(bgSource, this.props.bgSource);

    console.log('bgSourceChanged', bgSourceChanged, bgSource, this.props.bgSource);

    return endpointsChanged || bgSourceChanged
    // return endpointsChanged || chartPrefsChanged || bgSourceChanged
      ? {
        data: endpointsChanged,
        // data: endpointsChanged || chartPrefsChanged,
        full: bgSourceChanged,
      }
      : false;
  };

  renderStats = (stats) => (_.map(stats, (stat, i) => (<Stat key={stat.id} bgPrefs={this.bgPrefs} {...stat} />)));

  render = () => {
    return (
      <div className="Stats">
        {this.renderStats(this.state.stats)}
      </div>
    );
  };

  getStatsByChartType = (props = this.props) => {
    const {
      chartType,
      dataUtil,
    } = props;

    const { bgSource } = dataUtil;

    const { manufacturer, deviceModel } = dataUtil.latestPump;
    const isAutomatedBasalDevice = isAutomatedBasalDeviceCheck(manufacturer, deviceModel);

    const stats = [];

    const addStat = statType => {
      stats.push(getStatDefinition(dataUtil[this.dataFetchMethods[statType]](), statType, {
        manufacturer,
      }));
    };

    const cbgSelected = bgSource === 'cbg';
    const smbgSelected = bgSource === 'smbg';

    switch (chartType) {
      case 'basics':
        cbgSelected && addStat(commonStats.glucoseManagementIndex);
        addStat(commonStats.averageBg);
        cbgSelected && addStat(commonStats.timeInRange);
        smbgSelected && addStat(commonStats.readingsInRange);
        addStat(commonStats.standardDev);
        addStat(commonStats.coefficientOfVariation);
        addStat(commonStats.averageDailyCarbs);
        isAutomatedBasalDevice && addStat(commonStats.timeInAuto);
        addStat(commonStats.totalInsulin);
        break;

      case 'daily':
        addStat(commonStats.averageBg);
        cbgSelected && addStat(commonStats.timeInRange);
        smbgSelected && addStat(commonStats.readingsInRange);
        cbgSelected && addStat(commonStats.standardDev);
        cbgSelected && addStat(commonStats.coefficientOfVariation);
        isAutomatedBasalDevice && addStat(commonStats.timeInAuto);
        addStat(commonStats.totalInsulin);
        break;

      case 'weekly':
        addStat(commonStats.readingsInRange);
        addStat(commonStats.averageBg);
        addStat(commonStats.standardDev);
        addStat(commonStats.coefficientOfVariation);
        break;

      case 'trends':
        cbgSelected && addStat(commonStats.timeInRange);
        smbgSelected && addStat(commonStats.readingsInRange);
        addStat(commonStats.averageBg);
        addStat(commonStats.standardDev);
        addStat(commonStats.coefficientOfVariation);
        addStat(commonStats.glucoseManagementIndex);
        break;
    }

    return stats;
  };

  updateDataUtilEndpoints = props => {
    const {
      dataUtil,
      endpoints,
    } = props;

    dataUtil.endpoints = endpoints;
  };

  updateStats = props => {
    const { dataUtil } = props;
    const stats = this.state.stats;

    _.each(stats, (stat, i) => {
      stats[i].data = getStatData(dataUtil[this.dataFetchMethods[stat.id]](), stat.id, {
        manufacturer: dataUtil.latestPump.manufacturer,
      });
    });

    this.setState(stats);
  };
};

export default Stats
